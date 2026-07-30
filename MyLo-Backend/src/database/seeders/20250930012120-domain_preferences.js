'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const domainPreferences = await queryInterface.sequelize.query(`SELECT COUNT(*) as count FROM origins domain_preferences;`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    if (domainPreferences[0].count > 0) {
      console.log('Preferences already seeded. Skipping...');
      return;
    }

    // Fetch all users
    const users = await queryInterface.sequelize.query(
      `
      SELECT u.id FROM users u
      INNER JOIN roles r ON u."roleId" = r.id
      WHERE r.name IN ('citizen', 'organization');
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Fetch all domains
    const domains = await queryInterface.sequelize.query(
      `SELECT id FROM domains;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Generate preferences: one domain per profile
    const preferences = users.map((user) => {
      const randomDomain = domains[Math.floor(Math.random() * domains.length)];
      return {
        id: uuidv4(),
        userId: user.id,
        domainId: randomDomain.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    await queryInterface.bulkInsert('domain_preferences', preferences);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('domain_preferences', null, {});
  },
};
