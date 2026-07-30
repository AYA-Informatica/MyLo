'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const allProfiles = await queryInterface.sequelize.query(`SELECT COUNT(*) as count FROM profiles;`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    if (allProfiles[0].count > 0) {
      console.log('Profiles already seeded. Skipping...');
      return;
    }
    // First, get existing users from the database
    const users = await queryInterface.sequelize.query(
      `SELECT u.id, u.name, u.username, r.name as role 
       FROM users u 
       INNER JOIN roles r ON u."roleId" = r.id`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    const profiles = [];
    const now = new Date();

    users.forEach((user) => {
      if (user.role === 'citizen') {
        profiles.push({
          id: uuidv4(),
          userId: user.id,
          userRole: user.role,
          name: user.name || 'Unknown',
          bio: 'Passionate advocate for justice and equality. Committed to making a difference in my community through legal awareness and civic engagement.',
          occupation: [
            'Software Engineer',
            'Teacher',
            'Healthcare Worker',
            'Business Analyst',
            'Marketing Manager',
          ][Math.floor(Math.random() * 5)],
          phoneNumber: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
          imageUrl: `https://i.pravatar.cc/300?u=${user.id}`,
          socials: JSON.stringify( {
            linkedin: `https://linkedin.com/in/${user.username || user.name.toLowerCase().replace(/\s+/g, '-')}`,
            twitter: `https://twitter.com/${user.username || user.name.toLowerCase().replace(/\s+/g, '')}`,
            github:
              Math.random() > 0.5
                ? `https://github.com/${user.username || user.name.toLowerCase().replace(/\s+/g, '')}`
                : null,
          }),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      } else if (user.role === 'organization') {
        const orgTypes = [
          'Tech Solutions Inc.',
          'Green Energy Corp.',
          'Healthcare Plus',
          'EduTech Foundation',
          'Finance Group',
        ];
        const industries = ['Technology', 'Energy', 'Healthcare', 'Education', 'Finance'];
        const index = Math.floor(Math.random() * orgTypes.length);

        profiles.push({
          id: uuidv4(),
          userId: user.id,
          userRole: user.role,
          name: user.name || 'Unknown',
          name: user.name || orgTypes[index],
          bio: `Leading organization in ${industries[index]} sector. Dedicated to innovation, sustainability, and social responsibility. Committed to creating positive impact through ethical business practices.`,
          website: `https://www.${(user.name || orgTypes[index]).toLowerCase().replace(/\s+/g, '')}.com`,
          phoneNumber: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
          imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || orgTypes[index])}&size=300&background=random`,
          teamSize: Math.floor(Math.random() * 500) + 50,
          yearsOfExperience: Math.floor(Math.random() * 30) + 5,
          establishedAt: new Date(
            Date.now() - (Math.floor(Math.random() * 30) + 5) * 365 * 24 * 60 * 60 * 1000,
          ),
          socials: JSON.stringify({
            linkedin: `https://linkedin.com/company/${(user.name || orgTypes[index]).toLowerCase().replace(/\s+/g, '-')}`,
            twitter: `https://twitter.com/${(user.name || orgTypes[index]).toLowerCase().replace(/\s+/g, '')}`,
            facebook: `https://facebook.com/${(user.name || orgTypes[index]).toLowerCase().replace(/\s+/g, '')}`,
            website: `https://www.${(user.name || orgTypes[index]).toLowerCase().replace(/\s+/g, '')}.com`,
          }),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      } else if (user.role === 'law-firm') {
        const firmTypes = [
          'Smith & Associates Law Firm',
          'Johnson Legal Group',
          'Williams Law Partners',
          'Brown Legal Services',
          'Davis & Co. Attorneys',
        ];
        const firmName = user.name || firmTypes[Math.floor(Math.random() * firmTypes.length)];

        profiles.push({
          id: uuidv4(),
          userId: user.id,
          userRole: user.role,
          name: user.name || 'Unknown',
          name: firmName,
          bio: 'Experienced legal professionals providing comprehensive legal services. Specializing in corporate law, civil litigation, and family law. Committed to delivering exceptional legal representation with integrity and excellence.',
          website: `https://www.${firmName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          phoneNumber: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
          imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firmName)}&size=300&background=1e40af&color=fff`,
          teamSize: Math.floor(Math.random() * 100) + 10,
          yearsOfExperience: Math.floor(Math.random() * 40) + 10,
          caseResolved: Math.floor(Math.random() * 1000) + 100,
          successRate: (Math.random() * 20 + 80).toFixed(2),
          establishedAt: new Date(
            Date.now() - (Math.floor(Math.random() * 40) + 10) * 365 * 24 * 60 * 60 * 1000,
          ),
          socials: JSON.stringify({
            linkedin: `https://linkedin.com/company/${firmName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            twitter: `https://twitter.com/${firmName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            facebook: `https://facebook.com/${firmName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            website: `https://www.${firmName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          }),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      }
    });

    if (profiles.length > 0) {
      await queryInterface.bulkInsert('profiles', profiles, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('profiles', null, {});
  },
};
