import dotenv from 'dotenv';
import path from 'path';

// Load .env from server dir or root dir
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Deal } from '../models/Deal';
import { Task } from '../models/Task';
import { Activity } from '../models/Activity';
import { Notification } from '../models/Notification';
import { generateTaskNotifications } from '../services/notificationService';

async function seed() {
  console.log('--- Starting ClientFlow CRM Database Seed ---');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    process.exit(1);
  }

  await connectDB();

  console.log('Clearing existing records for a fresh seed...');
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Deal.deleteMany({}),
    Task.deleteMany({}),
    Activity.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // 1. Create Admin User
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = await User.create({
    name: 'Alex Admin',
    email: adminEmail.toLowerCase().trim(),
    passwordHash: adminHash,
    role: 'admin',
    isActive: true,
  });
  console.log(`Created Admin user: ${admin.email}`);

  // 2. Create Staff Users for multi-user workflow demonstration
  const staffHash = await bcrypt.hash('StaffPassword123!', 10);
  const staff1 = await User.create({
    name: 'Sarah Sales',
    email: 'sarah.sales@clientflow.com',
    passwordHash: staffHash,
    role: 'staff',
    isActive: true,
  });

  const staff2 = await User.create({
    name: 'David Dealmaker',
    email: 'david.deals@clientflow.com',
    passwordHash: staffHash,
    role: 'staff',
    isActive: true,
  });
  console.log(`Created Staff users: ${staff1.email}, ${staff2.email}`);

  // 3. Create Sample Customers
  const customersData = [
    {
      name: 'Elena Rostova',
      email: 'elena@vanguardtech.io',
      phone: '+1 (555) 234-5678',
      company: 'Vanguard Technologies',
      jobTitle: 'VP of Engineering',
      address: '100 Innovation Way, Austin, TX 78701',
      status: 'active',
      ownerId: admin._id,
      createdBy: admin._id,
    },
    {
      name: 'Marcus Chen',
      email: 'marcus.chen@nexusmedia.com',
      phone: '+1 (555) 345-6789',
      company: 'Nexus Media Group',
      jobTitle: 'Chief Marketing Officer',
      address: '450 Lexington Ave, New York, NY 10017',
      status: 'active',
      ownerId: staff1._id,
      createdBy: admin._id,
    },
    {
      name: 'Sophia Patel',
      email: 'sophia@solargreensolutions.org',
      phone: '+1 (555) 456-7890',
      company: 'SolarGreen Solutions',
      jobTitle: 'Director of Procurement',
      address: '88 Evergreen Terrace, Portland, OR 97201',
      status: 'active',
      ownerId: staff1._id,
      createdBy: staff1._id,
    },
    {
      name: 'James Thornton',
      email: 'j.thornton@apexlogistics.co',
      phone: '+1 (555) 567-8901',
      company: 'Apex Freight & Logistics',
      jobTitle: 'Operations Director',
      address: '1200 Harbor Blvd, Long Beach, CA 90802',
      status: 'active',
      ownerId: staff2._id,
      createdBy: admin._id,
    },
    {
      name: 'Amira Al-Mansoor',
      email: 'amira@finovatedynamics.com',
      phone: '+1 (555) 678-9012',
      company: 'Finovate Dynamics',
      jobTitle: 'Head of Partnerships',
      address: '250 Financial Plaza, Chicago, IL 60606',
      status: 'active',
      ownerId: admin._id,
      createdBy: admin._id,
    },
    {
      name: 'Lucas Dupont',
      email: 'lucas@stratoscloud.eu',
      phone: '+1 (555) 789-0123',
      company: 'Stratos Cloud Systems',
      jobTitle: 'Managing Partner',
      address: '77 Silicon Blvd, San Jose, CA 95113',
      status: 'inactive',
      ownerId: staff2._id,
      createdBy: staff2._id,
    },
  ];

  const createdCustomers = await Customer.insertMany(customersData);
  console.log(`Created ${createdCustomers.length} sample customers.`);

  // 4. Create Sample Deals across all 6 stages
  const now = new Date();
  const pastMonth = (monthsAgo: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    return d;
  };
  const futureDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const dealsData = [
    {
      title: 'Enterprise CRM Migration Suite',
      customerId: createdCustomers[0]._id,
      value: 48000,
      leadSource: 'Website',
      stage: 'Won',
      expectedCloseDate: pastMonth(2),
      closedAt: pastMonth(2),
      ownerId: admin._id,
    },
    {
      title: 'Annual Marketing Automation Platform',
      customerId: createdCustomers[1]._id,
      value: 27500,
      leadSource: 'Referral',
      stage: 'Proposal',
      expectedCloseDate: futureDays(14),
      ownerId: staff1._id,
    },
    {
      title: 'Solar Supply Chain Analytics Module',
      customerId: createdCustomers[2]._id,
      value: 36000,
      leadSource: 'Partner',
      stage: 'Qualified',
      expectedCloseDate: futureDays(25),
      ownerId: staff1._id,
    },
    {
      title: 'Fleet Tracking & Routing API Integration',
      customerId: createdCustomers[3]._id,
      value: 62000,
      leadSource: 'Cold Call',
      stage: 'Contacted',
      expectedCloseDate: futureDays(40),
      ownerId: staff2._id,
    },
    {
      title: 'Algorithmic Risk Management Portal',
      customerId: createdCustomers[4]._id,
      value: 85000,
      leadSource: 'LinkedIn',
      stage: 'Won',
      expectedCloseDate: pastMonth(1),
      closedAt: pastMonth(1),
      ownerId: admin._id,
    },
    {
      title: 'Legacy Server Cloud Backup Plan',
      customerId: createdCustomers[5]._id,
      value: 14000,
      leadSource: 'Website',
      stage: 'Lost',
      expectedCloseDate: pastMonth(3),
      closedAt: pastMonth(3),
      ownerId: staff2._id,
    },
    {
      title: 'Next-Gen Workflow Automation Pilot',
      customerId: createdCustomers[0]._id,
      value: 19500,
      leadSource: 'Referral',
      stage: 'New Lead',
      expectedCloseDate: futureDays(30),
      ownerId: admin._id,
    },
    {
      title: 'Global Compliance Audit Package',
      customerId: createdCustomers[4]._id,
      value: 52000,
      leadSource: 'Website',
      stage: 'Won',
      expectedCloseDate: pastMonth(0),
      closedAt: pastMonth(0),
      ownerId: admin._id,
    },
  ];

  const createdDeals = await Deal.insertMany(dealsData);
  console.log(`Created ${createdDeals.length} sample deals.`);

  // 5. Create Sample Tasks (overdue, due today, due soon, completed)
  const today = new Date();
  today.setHours(17, 0, 0, 0);

  const dueSoon = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
  const overdueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const tasksData = [
    {
      description: 'Prepare security and compliance questionnaire response',
      priority: 'high',
      dueDate: overdueDate,
      assignedTo: admin._id,
      customerId: createdCustomers[0]._id,
      dealId: createdDeals[0]._id,
      isCompleted: false,
      createdBy: admin._id,
    },
    {
      description: 'Send revised custom proposal with tiered discounting',
      priority: 'high',
      dueDate: dueSoon,
      assignedTo: staff1._id,
      customerId: createdCustomers[1]._id,
      dealId: createdDeals[1]._id,
      isCompleted: false,
      createdBy: admin._id,
    },
    {
      description: 'Executive follow-up call with procurement committee',
      priority: 'medium',
      dueDate: today,
      assignedTo: admin._id,
      customerId: createdCustomers[4]._id,
      dealId: createdDeals[4]._id,
      isCompleted: false,
      createdBy: admin._id,
    },
    {
      description: 'Conduct live API capabilities demo with engineering lead',
      priority: 'medium',
      dueDate: nextWeek,
      assignedTo: staff2._id,
      customerId: createdCustomers[3]._id,
      dealId: createdDeals[3]._id,
      isCompleted: false,
      createdBy: staff2._id,
    },
    {
      description: 'Finalize and countersign Master Services Agreement',
      priority: 'low',
      dueDate: pastMonth(1),
      assignedTo: admin._id,
      customerId: createdCustomers[4]._id,
      dealId: createdDeals[4]._id,
      isCompleted: true,
      completedAt: pastMonth(1),
      createdBy: admin._id,
    },
  ];

  const createdTasks = await Task.insertMany(tasksData);
  console.log(`Created ${createdTasks.length} sample tasks.`);

  // 6. Create Activities & Timeline
  const activitiesData = [
    {
      type: 'deal_update',
      content: 'Deal "Enterprise CRM Migration Suite" marked as Won! Total revenue booked: $48,000.',
      customerId: createdCustomers[0]._id,
      dealId: createdDeals[0]._id,
      createdBy: admin._id,
    },
    {
      type: 'call',
      content: 'Spoke with Marcus regarding their Q4 budget approval. He confirmed decision will be finalized next Tuesday.',
      customerId: createdCustomers[1]._id,
      dealId: createdDeals[1]._id,
      createdBy: staff1._id,
    },
    {
      type: 'meeting',
      content: 'In-person architecture discovery session at Vanguard HQ. Addressed SSO, role-based controls, and export requirements.',
      customerId: createdCustomers[0]._id,
      createdBy: admin._id,
    },
    {
      type: 'note',
      content: 'Client requested NDA before sharing technical architecture diagrams.',
      customerId: createdCustomers[2]._id,
      dealId: createdDeals[2]._id,
      createdBy: staff1._id,
    },
    {
      type: 'system',
      content: 'Completed task: "Finalize and countersign Master Services Agreement"',
      customerId: createdCustomers[4]._id,
      dealId: createdDeals[4]._id,
      createdBy: admin._id,
    },
  ];

  await Activity.insertMany(activitiesData);
  console.log(`Created ${activitiesData.length} sample activities.`);

  // 7. Generate Initial Task Notifications
  await generateTaskNotifications();
  const notificationCount = await Notification.countDocuments();
  console.log(`Generated ${notificationCount} initial alerts for due/overdue tasks.`);

  console.log('--- Database seeding completed successfully! ---');
  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Fatal seed failure:', err);
  process.exit(1);
});
