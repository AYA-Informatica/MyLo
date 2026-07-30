'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    const getAllSpecialties = await queryInterface.sequelize.query(`SELECT COUNT(*) as count FROM origins domain_preferences;`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    if (getAllSpecialties[0].count > 0) {
      console.log('Specialities already seeded. Skipping...');
      return;
    }

    // Fetch law-firm users via role association
    const lawFirms = await queryInterface.sequelize.query(
      `
      SELECT u.id FROM users u
      INNER JOIN roles r ON u."roleId" = r.id
      WHERE r.name = 'law-firm';
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Fetch all domains
    const domains = await queryInterface.sequelize.query(
      `SELECT id FROM domains;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Generate specialties: one domain per firm
    const specialties = lawFirms.map((firm) => {
      const randomDomain = domains[Math.floor(Math.random() * domains.length)];
      return {
        id: uuidv4(),
        firmId: firm.id,
        domainId: randomDomain.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    await queryInterface.bulkInsert('specialties', specialties);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('specialties', null, {});
  },
};
