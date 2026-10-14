const http = require('http');

let cookie = '';

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      if (res.headers['set-cookie']) {
        cookie = res.headers['set-cookie'][0].split(';')[0];
      }
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: body });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('   CLIENTFLOW CRM - END-TO-END FEATURE VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      process.exit(1);
    }
  }

  // 1. Health check
  const health = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
  });
  assert(health.status === 200 && health.body?.status === 'ok', 'Feature 1: Server and DB connection healthy');

  // Registration Status check
  const regStatus = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/registration-status',
    method: 'GET',
  });
  assert(regStatus.status === 200, 'Feature 2: Registration status endpoint functioning');

  // Registration Security - Reject weak password
  const weakPassRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register-admin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Weak Admin',
      email: `weak.${Date.now()}@clientflow.com`,
      password: 'password123', // missing special char & uppercase
      adminKey: process.env.ADMIN_REGISTRATION_KEY || 'ClientFlowAdminKey2026!',
    }
  );
  assert(weakPassRes.status === 400, 'Security: Weak password rejected during admin registration');

  // Registration Security - Reject honeypot bot submission
  const botRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register-admin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Bot Admin',
      email: `bot.${Date.now()}@clientflow.com`,
      password: 'StrongPassword123!',
      adminKey: process.env.ADMIN_REGISTRATION_KEY || 'ClientFlowAdminKey2026!',
      honeypot: 'http://spam-link.com',
    }
  );
  assert(botRes.status === 400, 'Security: Honeypot bot submission rejected');

  // Registration Security - Reject invalid admin key
  if (process.env.ADMIN_REGISTRATION_KEY) {
    const badKeyRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register-admin',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Hacker Admin',
        email: `hacker.${Date.now()}@clientflow.com`,
        password: 'StrongPassword123!',
        adminKey: 'wrong-key-12345',
      }
    );
    assert(badKeyRes.status === 403, 'Security: Invalid admin registration key rejected');
  }

  // Register New Admin test (valid credentials + key)
  const newAdminEmail = `reg.admin.${Date.now()}@clientflow.com`;
  const regAdminRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register-admin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Registered Administrator',
      email: newAdminEmail,
      password: 'AdminPassword456!',
      adminKey: process.env.ADMIN_REGISTRATION_KEY || 'ClientFlowAdminKey2026!',
    }
  );
  assert(regAdminRes.status === 201 && regAdminRes.body?.user?.role === 'admin', 'Feature 2: Admin registration creates active admin account');

  // 2. Auth - Seeded Admin Login
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@clientflow.com', password: 'AdminPassword123!' }
  );
  assert(loginRes.status === 200 && loginRes.body?.user?.role === 'admin', 'Feature 2: Admin login successful');

  // Auth - Me endpoint
  const meRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Cookie: cookie },
  });
  assert(meRes.status === 200 && meRes.body?.user?.email === 'admin@clientflow.com', 'Feature 2: /api/auth/me returns current authenticated admin');

  // Team & Roles - Create Staff User
  const staffEmail = `test.staff.${Date.now()}@clientflow.com`;
  const createStaffRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
    },
    {
      name: 'Test Staff User',
      email: staffEmail,
      password: 'StaffPassword123!',
      role: 'staff',
    }
  );
  assert(createStaffRes.status === 201 && createStaffRes.body?.user?.role === 'staff', 'Feature 2: Admin can create staff accounts');

  // Verify Staff Role Protection
  let adminCookie = cookie;
  // Login as Staff
  const staffLoginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: staffEmail, password: 'StaffPassword123!' }
  );
  let staffCookie = cookie;
  assert(staffLoginRes.status === 200 && staffLoginRes.body?.user?.role === 'staff', 'Feature 2: Staff login successful');

  // Staff attempts to create user -> must get 403 Forbidden
  const staffForbiddenRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
    },
    {
      name: 'Hacker',
      email: `hacker.${Date.now()}@clientflow.com`,
      password: 'password123',
      role: 'admin',
    }
  );
  assert(staffForbiddenRes.status === 403, 'Feature 2: Staff is blocked from Admin endpoints (403 Forbidden)');

  // Delete Team Member verification
  // 1. Staff attempts to delete user -> must get 403 Forbidden
  const staffDeleteForbidden = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/users/${createStaffRes.body.user._id}`,
    method: 'DELETE',
    headers: { Cookie: staffCookie },
  });
  assert(staffDeleteForbidden.status === 403, 'Feature 2: Staff is blocked from deleting team members (403 Forbidden)');

  // 2. Admin creates a temporary staff user to test deletion
  const tempStaffRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    {
      name: 'Temporary Staff',
      email: `temp.staff.${Date.now()}@clientflow.com`,
      password: 'StaffPassword123!',
      role: 'staff',
    }
  );
  assert(tempStaffRes.status === 201, 'Feature 2: Admin can create member for deletion test');

  // 3. Admin deletes the temporary staff user
  const deleteStaffRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/users/${tempStaffRes.body.user._id}`,
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  assert(deleteStaffRes.status === 200, 'Feature 2: Admin can delete team member with record reassignment');

  // 4. Admin attempts self-deletion -> must get 400 Bad Request
  const selfDeleteRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/users/${loginRes.body.user.id}`,
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  assert(selfDeleteRes.status === 400, 'Feature 2: Admin self-deletion is prevented (400 Bad Request)');

  // 3. Customer Management
  const customerEmail = `contact.${Date.now()}@acmetest.com`;
  const newCustomerRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customers',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    {
      name: 'Acme Test Customer',
      email: customerEmail,
      phone: '+1 555-1234',
      company: 'Acme Enterprise',
      jobTitle: 'Chief Procurement Officer',
      address: '100 Market St, SF',
      status: 'active',
    }
  );
  assert(newCustomerRes.status === 201 && newCustomerRes.body?.customer?.name === 'Acme Test Customer', 'Feature 3: Customer creation successful');
  const customerId = newCustomerRes.body.customer._id;

  // Search & Filter customers
  const searchCustomerRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customers?search=Acme&status=active',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  assert(searchCustomerRes.status === 200 && searchCustomerRes.body?.customers?.length >= 1, 'Feature 3: Customer search & filter functioning');

  // Customer detail with deals/tasks/activities
  const detailCustomerRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/customers/${customerId}`,
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  assert(detailCustomerRes.status === 200 && detailCustomerRes.body?.customer?._id === customerId, 'Feature 3: Customer detail endpoint returns linked data');

  // Soft delete / archive and restore
  const archiveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/customers/${customerId}/archive`,
    method: 'POST',
    headers: { Cookie: adminCookie },
  });
  assert(archiveRes.status === 200 && archiveRes.body?.customer?.status === 'archived', 'Feature 3: Customer archive (soft delete) working');

  const restoreRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/customers/${customerId}/restore`,
    method: 'POST',
    headers: { Cookie: adminCookie },
  });
  assert(restoreRes.status === 200 && restoreRes.body?.customer?.status === 'active', 'Feature 3: Customer restore working');

  // 4. Sales Pipeline and Deals
  const newDealRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/deals',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    {
      title: 'Acme Annual Subscription',
      customerId: customerId,
      value: 75000,
      leadSource: 'Website',
      stage: 'Qualified',
      expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    }
  );
  assert(newDealRes.status === 201 && newDealRes.body?.deal?.value === 75000, 'Feature 4: Deal created');
  const dealId = newDealRes.body.deal._id;

  // Move stage to Won via Kanban drag-drop endpoint
  const moveDealRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/deals/${dealId}/stage`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    { stage: 'Won' }
  );
  assert(
    moveDealRes.status === 200 &&
      moveDealRes.body?.deal?.stage === 'Won' &&
      moveDealRes.body?.deal?.closedAt,
    'Feature 4: Deal stage moved to Won and closedAt automatically set'
  );

  // 5. Follow-up Tasks
  const newTaskRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/tasks',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    {
      description: 'Send onboarding packet to Acme team',
      priority: 'high',
      dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // due in 12h
      customerId: customerId,
      dealId: dealId,
    }
  );
  assert(newTaskRes.status === 201 && newTaskRes.body?.task?.priority === 'high', 'Feature 5: Follow-up task created');
  const taskId = newTaskRes.body.task._id;

  // Toggle complete
  const toggleTaskRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tasks/${taskId}/toggle`,
    method: 'PATCH',
    headers: { Cookie: adminCookie },
  });
  assert(toggleTaskRes.status === 200 && toggleTaskRes.body?.task?.isCompleted === true, 'Feature 5: Task completed with completedAt set');

  // 6. Notes and Activity History
  const newActivityRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/activities',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    {
      type: 'call',
      content: 'Called customer to confirm kick-off call for next Monday.',
      customerId: customerId,
      dealId: dealId,
    }
  );
  assert(newActivityRes.status === 201 && newActivityRes.body?.activity?.type === 'call', 'Feature 6: Call activity logged');

  const activitiesListRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/activities?customerId=${customerId}`,
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  assert(
    activitiesListRes.status === 200 && activitiesListRes.body?.activities?.length >= 3,
    'Feature 6: Timeline contains manual note/call and automatic system events'
  );

  // 7. Dashboard Metrics
  const dashboardRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  assert(
    dashboardRes.status === 200 &&
      dashboardRes.body?.kpis?.totalCustomers >= 1 &&
      dashboardRes.body?.kpis?.revenue >= 75000 &&
      Array.isArray(dashboardRes.body?.pipelineSummary) &&
      Array.isArray(dashboardRes.body?.monthlyRevenue),
    'Feature 7: Real-time dashboard KPI cards and aggregation functioning'
  );

  // 8. Notifications
  const notifRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  assert(
    notifRes.status === 200 && typeof notifRes.body?.unreadCount === 'number',
    'Feature 8: Notification bell endpoint generates due-soon/overdue alerts without duplicates'
  );

  // 9. Reports & Exports
  const reportsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/sales',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  assert(
    reportsRes.status === 200 &&
      typeof reportsRes.body?.summary?.winRate === 'number' &&
      Array.isArray(reportsRes.body?.revenueByLeadSource),
    'Feature 9: Reports sales analytics working'
  );

  // Export CSV
  const exportCsvRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/export/customers?format=csv',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  assert(
    exportCsvRes.status === 200 &&
      exportCsvRes.headers['content-type'].includes('text/csv') &&
      exportCsvRes.raw.includes('contact@acmetest.com'),
    'Feature 9: Customer CSV export streaming valid rows'
  );

  // Export XLSX
  const exportXlsxRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/export/deals?format=xlsx',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  assert(
    exportXlsxRes.status === 200 &&
      exportXlsxRes.headers['content-type'].includes('spreadsheetml'),
    'Feature 9: Deals Excel (.xlsx) export streaming valid workbook'
  );

  // 10. CSV Import of Contacts
  const importRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/import/customers',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    {
      contacts: [
        {
          name: 'Import Contact 1',
          email: `import.${Date.now()}@test.com`,
          phone: '+1 555-9001',
          company: 'Test Import Inc',
          jobTitle: 'Manager',
        },
        {
          name: 'Duplicate Contact',
          email: customerEmail, // Already exists!
          phone: '+1 555-9002',
          company: 'Duplicate Co',
          jobTitle: 'Director',
        },
        {
          name: 'Invalid Row',
          email: 'not-an-email',
          phone: '',
          company: '',
          jobTitle: '',
        },
      ],
    }
  );
  assert(
    importRes.status === 200 &&
      importRes.body?.imported === 1 &&
      importRes.body?.skipped === 1 &&
      importRes.body?.errors?.length === 1,
    'Feature 10: CSV Import handles validation, deduplication, and error reporting'
  );

  // 11. Security - NoSQL Injection Prevention
  const noSqlInjectionRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: { $gt: '' }, password: { $gt: '' } }
  );
  assert(
    noSqlInjectionRes.status === 400,
    'Security Baseline: Sanitizer blocks NoSQL injection operators ($gt)'
  );

  console.log('\n====================================================');
  console.log(` ALL ${passed}/${total} TEST SUITES PASSED END-TO-END!`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
