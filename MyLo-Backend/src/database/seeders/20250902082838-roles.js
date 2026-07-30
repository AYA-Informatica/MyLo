'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if any roles already exist
    const roles = await queryInterface.sequelize.query(`SELECT COUNT(*) as count FROM roles;`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    if (roles[0].count > 0) {
      console.log('Roles already seeded. Skipping...');
      return;
    }

    // Proceed with seeding roles
    await queryInterface.bulkInsert('roles', [
      {
        id: uuidv4(),
        name: 'citizen',
        permissions: ['read'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'law-firm',
        permissions: ['read', 'write', 'submit'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'organization',
        permissions: ['read', 'manage'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'admin',
        permissions: ['read', 'write', 'delete', 'manage'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  },
};
