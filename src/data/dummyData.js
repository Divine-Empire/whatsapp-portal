// ─────────────────────────────────────────────
// dummyData.js  –  Realistic simulation data
// ─────────────────────────────────────────────

const FIRST_NAMES = [
  'Aarav','Aditya','Ajay','Akash','Amit','Ananya','Anjali','Ankit','Arjun','Aryan',
  'Deepak','Divya','Gaurav','Harsh','Ishaan','Jatin','Kavita','Kavya','Kiran','Krishna',
  'Lalit','Manish','Meera','Mohit','Neha','Nikhil','Nikita','Pankaj','Pooja','Pradeep',
  'Priya','Rahul','Rajan','Rajesh','Rakesh','Ramesh','Ravi','Rohit','Sachin','Sandeep',
  'Sanjay','Sanya','Saurabh','Seema','Shikha','Shiv','Shruti','Simran','Sneha','Sonam',
  'Suresh','Swati','Tanvi','Tarun','Uma','Varun','Vikram','Vinay','Vishal','Yash'
];

const LAST_NAMES = [
  'Agarwal','Bhatia','Chandra','Chopra','Das','Desai','Dubey','Ghosh','Gupta','Jain',
  'Joshi','Kapoor','Kaur','Khanna','Kumar','Malhotra','Mehta','Mishra','Nair','Pandey',
  'Patel','Rao','Reddy','Saxena','Shah','Sharma','Singh','Sinha','Srivastava','Tiwari',
  'Verma','Yadav','Bansal','Chauhan','Doshi','Garg','Iyer','Lal','Mittal','Murthy'
];

const TEMPLATES = [
  { id: 'T001', name: 'Welcome Message',     status: 'approved', category: 'Onboarding' },
  { id: 'T002', name: 'Order Confirmation',  status: 'approved', category: 'Transactional' },
  { id: 'T003', name: 'Payment Reminder',    status: 'approved', category: 'Finance' },
  { id: 'T004', name: 'Delivery Update',     status: 'approved', category: 'Transactional' },
  { id: 'T005', name: 'Promo Diwali Offer',  status: 'pending',  category: 'Marketing' },
  { id: 'T006', name: 'Feedback Request',    status: 'approved', category: 'CRM' },
  { id: 'T007', name: 'Appointment Reminder',status: 'approved', category: 'Scheduling' },
  { id: 'T008', name: 'OTP Verification',    status: 'pending',  category: 'Security' },
  { id: 'T009', name: 'Cart Abandonment',    status: 'failed',   category: 'Marketing' },
  { id: 'T010', name: 'KYC Reminder',        status: 'approved', category: 'Compliance' },
  { id: 'T011', name: 'Loan Offer',          status: 'pending',  category: 'Finance' },
  { id: 'T012', name: 'Subscription Renewal',status: 'approved', category: 'Billing' },
];

const MSG_STATUSES = ['sent','delivered','read','failed','queue'];
const REPLY_SAMPLES = [
  'Yes, please proceed','No, cancel it','Thank you!','OK','When will it arrive?',
  'Can I reschedule?','Got it, thanks','Sure','Please call me','I need help',
  'What is the offer?','Yes I am interested','Not now, later please','Understood',
  'Please share more details','I already paid','Wait for my confirmation',
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generatePhone() {
  const prefixes = ['98','99','97','96','91','90','88','87','86','85'];
  return '+91 ' + rand(prefixes) + randInt(10000000, 99999999);
}

export function generateContacts(count = 200) {
  return Array.from({ length: count }, (_, i) => {
    const first = rand(FIRST_NAMES);
    const last  = rand(LAST_NAMES);
    return {
      id: `C${String(i + 1).padStart(4, '0')}`,
      name: `${first} ${last}`,
      phone: generatePhone(),
      avatar: `${first[0]}${last[0]}`,
      color: ['#25D366','#128C7E','#3b82f6','#eab308','#ec4899','#8b5cf6'][i % 6],
      lastMessage: rand(REPLY_SAMPLES),
      lastTime: new Date(Date.now() - randInt(0, 7 * 86400000)).toISOString(),
      unread: randInt(0, 5),
      templateId: rand(TEMPLATES).id,
      isArchived: Math.random() < 0.1,
      isMuted:    Math.random() < 0.15,
      isBlocked:  Math.random() < 0.05,
    };
  });
}

export function generateMessages(contacts, count = 1300) {
  const messages = [];
  for (let i = 0; i < count; i++) {
    const contact   = rand(contacts);
    const template  = rand(TEMPLATES);
    const statusW   = [0.05, 0.10, 0.55, 0.10, 0.20]; // queue, failed, delivered, sent, read
    const statusR   = Math.random();
    let status;
    if (statusR < 0.05)       status = 'queue';
    else if (statusR < 0.12)  status = 'failed';
    else if (statusR < 0.30)  status = 'sent';
    else if (statusR < 0.60)  status = 'delivered';
    else                      status = 'read';

    const hasReply = status === 'read' && Math.random() < 0.35;
    const ts = new Date(Date.now() - randInt(0, 14 * 86400000));
    messages.push({
      id: `M${String(i + 1).padStart(5, '0')}`,
      contactId:    contact.id,
      contactName:  contact.name,
      contactPhone: contact.phone,
      templateId:   template.id,
      templateName: template.name,
      status,
      hasReply,
      replyText:  hasReply ? rand(REPLY_SAMPLES) : null,
      timestamp:  ts.toISOString(),
      hour:       ts.getHours(),
      day:        ts.getDay(),
      type:       rand(['text','image','document','button']),
      creditCost: 1,
      cost: Number((0.4 + Math.random() * 0.4).toFixed(2)),
    });
  }
  return messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function generateTemplates(messages) {
  return TEMPLATES.map(t => {
    const msgs = messages.filter(m => m.templateId === t.id);
    const sent      = msgs.length;
    const delivered = msgs.filter(m => ['delivered','read'].includes(m.status)).length;
    const read      = msgs.filter(m => m.status === 'read').length;
    const failed    = msgs.filter(m => m.status === 'failed').length;
    const queue     = msgs.filter(m => m.status === 'queue').length;
    const replied   = msgs.filter(m => m.hasReply).length;
    return {
      ...t,
      sent, delivered, read, failed, queue, replied,
      cost: Number((0.4 + Math.random() * 0.4).toFixed(2)), // Random cost between 0.4 and 0.8
      deliveryRate: sent ? Math.round((delivered / sent) * 100) : 0,
      readRate:     sent ? Math.round((read / sent) * 100) : 0,
      replyRate:    sent ? Math.round((replied / sent) * 100) : 0,
      body: `This is the body of your "${t.name}" template. It contains personalization like {{1}} and {{2}}.`,
      buttons: t.category === 'Marketing' ? ['Learn More', 'Unsubscribe'] : [],
    };
  });
}

export function generateHourlyData(messages) {
  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2,'0')}:00`,
    sent: 0, delivered: 0, read: 0, failed: 0,
  }));
  messages.forEach(m => {
    const h = m.hour;
    hours[h].sent++;
    if (['delivered','read'].includes(m.status)) hours[h].delivered++;
    if (m.status === 'read') hours[h].read++;
    if (m.status === 'failed') hours[h].failed++;
  });
  return hours;
}

export function generateDailyTrend(messages) {
  const days = [];
  for (let d = 13; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000);
    const label = date.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
    const dayMsgs = messages.filter(m => {
      const mDate = new Date(m.timestamp);
      return mDate.toDateString() === date.toDateString();
    });
    days.push({
      date: label,
      sent:      dayMsgs.length,
      delivered: dayMsgs.filter(m => ['delivered','read'].includes(m.status)).length,
      read:      dayMsgs.filter(m => m.status === 'read').length,
      failed:    dayMsgs.filter(m => m.status === 'failed').length,
    });
  }
  return days;
}

export function generateCredits(messages) {
  const used = messages.filter(m => m.status !== 'queue').length;
  const total = 5000;
  const transactions = messages
    .filter(m => m.status !== 'queue')
    .slice(0, 50)
    .map(m => ({
      id:       m.id,
      type:     'debit',
      amount:   1,
      reason:   `${m.templateName} → ${m.contactName}`,
      timestamp: m.timestamp,
    }));
  return { total, used, remaining: total - used, transactions };
}

export function generateConversations(contacts, messages) {
  return contacts.slice(0, 30).map(c => {
    const contactMsgs = messages
      .filter(m => m.contactId === c.id)
      .slice(0, 15)
      .map(m => [
        { id: m.id + '_out', direction: 'out', text: `${m.templateName} message sent to you.`, timestamp: m.timestamp, status: m.status },
        ...(m.hasReply ? [{
          id: m.id + '_in', direction: 'in', text: m.replyText, timestamp: new Date(new Date(m.timestamp).getTime() + randInt(30000, 300000)).toISOString(), status: 'read'
        }] : []),
      ]).flat();
    return { contactId: c.id, messages: contactMsgs.sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp)) };
  });
}

export const RAW_TEMPLATES = TEMPLATES;
