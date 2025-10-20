require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const School = require('./models/School');

const schools = [
  { name: "University of London", lat: 51.5074, lng: -0.1278, address: "London, UK", description: "Leading UK university" },
  { name: "University of Oxford", lat: 51.7520, lng: -1.2577, address: "Oxford, UK", description: "World's oldest English-speaking university" },
  { name: "University of Cambridge", lat: 52.2053, lng: 0.1218, address: "Cambridge, UK", description: "Historic collegiate university" },
  { name: "University of Manchester", lat: 53.4808, lng: -2.2426, address: "Manchester, UK", description: "Major research university" },
  { name: "University of Birmingham", lat: 52.4862, lng: -1.8904, address: "Birmingham, UK", description: "Redbrick university" },
  { name: "University of Edinburgh", lat: 55.9533, lng: -3.1883, address: "Edinburgh, UK", description: "Scottish ancient university" },
  { name: "University of Bristol", lat: 51.4545, lng: -2.5879, address: "Bristol, UK", description: "Research-intensive university" },
  { name: "University of Leeds", lat: 53.8008, lng: -1.5491, address: "Leeds, UK", description: "Top Russell Group university" }
];

async function seed() {
  try {
    console.log('🌱 Seeding Campus Revival Movement database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await User.deleteMany({});
    await School.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // CREATE 4 USERS (UPDATED!)
    const admin = await User.create({
      email: 'admin@crm.org',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin'
    });
    console.log('👤 Created admin user');

    const user1 = await User.create({
      email: 'john@example.com',
      password: 'password123',
      name: 'John Doe',
      role: 'adopter'
    });
    console.log('👤 Created test user 1');

    const user2 = await User.create({
      email: 'sarah@example.com',
      password: 'password123',
      name: 'Sarah Smith',
      role: 'adopter'
    });
    console.log('👤 Created test user 2');

    const user3 = await User.create({
      email: 'mike@example.com',
      password: 'password123',
      name: 'Mike Johnson',
      role: 'adopter'
    });
    console.log('👤 Created test user 3');

    // CREATE SCHOOLS
    await School.insertMany(schools);
    console.log(`🏫 Created ${schools.length} schools`);

    console.log('\n✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════');
    console.log('🚀 LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════');
    console.log('👑 ADMIN:        admin@crm.org / admin123');
    console.log('🙏 USER 1 (John): john@example.com / password123');
    console.log('🙏 USER 2 (Sarah):sarah@example.com / password123');
    console.log('🙏 USER 3 (Mike): mike@example.com / password123');
    console.log('═══════════════════════════════════════');
    console.log(`🏫 TOTAL SCHOOLS: ${schools.length}`);
    console.log(`👥 TOTAL USERS: 4`);
    console.log('\n🌐 TEST API: http://localhost:5000/api/schools');
    console.log('🔐 TEST LOGIN: http://localhost:5000/api/login\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ SEED ERROR:', error.message);
    process.exit(1);
  }
}

seed();