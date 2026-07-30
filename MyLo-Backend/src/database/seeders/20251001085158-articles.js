'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if articles already exist
    const existing = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM articles;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (parseInt(existing[0].count, 10) > 0) {
      console.log('Articles already seeded. Skipping...');
      return;
    }

    // Fetch laws
    const laws = await queryInterface.sequelize.query(
      'SELECT id FROM laws;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Sample article data
    const sampleArticles = [
      {
        articleNumber: 'Article 1',
        title: 'General Provisions',
        content: 'This article outlines the general principles and scope of the law.',
      },
      {
        articleNumber: 'Article 2',
        title: 'Definitions',
        content: 'This article provides definitions for key terms used throughout the law.',
      },
      {
        articleNumber: 'Article 3',
        title: 'Rights and Obligations',
        content: 'This article details the rights and obligations of individuals and entities under the law.',
      },
      {
        articleNumber: 'Article 4',
        title: 'Enforcement Mechanisms',
        content: 'This article describes the enforcement procedures and responsible authorities.',
      },
    ];

    // Generate articles linked to laws
    const articles = laws.flatMap((law) =>
      sampleArticles.map((article) => ({
        id: uuidv4(),
        lawId: law.id,
        articleNumber: article.articleNumber,
        title: article.title,
        content: article.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );

    await queryInterface.bulkInsert('articles', articles);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('articles', null, {});
  },
};
