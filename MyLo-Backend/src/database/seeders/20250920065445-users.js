'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if any users already exist
    const users = await queryInterface.sequelize.query(`SELECT COUNT(*) as count FROM users;`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    if (users[0].count > 0) {
      console.log('Users already seeded. Skipping...');
      return;
    }

    // Get role IDs
    const roles = await queryInterface.sequelize.query(`SELECT id, name FROM roles;`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    const getRoleId = (roleName) => {
      const role = roles.find((r) => r.name === roleName);
      return role ? role.id : null;
    };

    const hashedPassword = await bcrypt.hash('password123', 10);

    await queryInterface.bulkInsert('users', [
      // Citizens
      {
        id: uuidv4(),
        username: '@john_citizen',
        name: 'John Doe',
        email: 'john.citizen@example.com',
        password: hashedPassword,
        roleId: getRoleId('citizen'),
        isActive: true,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        username: '@jane_citizen',
        name: 'Jane Smith',
        email: 'jane.citizen@example.com',
        password: hashedPassword,
        roleId: getRoleId('citizen'),
        isActive: true,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        username: '@mike_citizen',
        name: 'Mike Johnson',
        email: 'mike.citizen@example.com',
        password: hashedPassword,
        roleId: getRoleId('citizen'),
        isActive: true,
        provider: 'google',
        googleId: 'google123456789',
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Organizations
      {
        id: uuidv4(),
        name: 'TechCorp Rwanda',
        email: 'admin@techcorp.rw',
        address: 'KG 123 St, Kigali',
        registrationNumber: 12345678,
        password: hashedPassword,
        roleId: getRoleId('organization'),
        isActive: true,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Green Energy Solutions',
        email: 'contact@greenenergy.rw',
        address: 'KN 456 Ave, Kigali',
        registrationNumber: 87654321,
        password: hashedPassword,
        roleId: getRoleId('organization'),
        isActive: true,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Healthcare Plus',
        email: 'info@healthcareplus.rw',
        address: 'KK 789 Rd, Kigali',
        registrationNumber: 11223344,
        password: hashedPassword,
        roleId: getRoleId('organization'),
        isActive: false,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Law Firms
      {
        id: uuidv4(),
        name: 'Rwanda Legal Associates',
        email: 'partners@rwlegal.rw',
        address: 'KG 100 St, Kigali',
        registrationNumber: 55667788,
        password: hashedPassword,
        roleId: getRoleId('law-firm'),
        isActive: true,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Kigali Law Partners',
        email: 'admin@kigalilaw.rw',
        address: 'KN 200 Ave, Kigali',
        registrationNumber: 99887766,
        password: hashedPassword,
        roleId: getRoleId('law-firm'),
        isActive: true,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Justice & Rights Firm',
        email: 'contact@justicerights.rw',
        address: 'KK 300 Rd, Kigali',
        registrationNumber: 44556677,
        password: hashedPassword,
        roleId: getRoleId('law-firm'),
        isActive: true,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  },
};
