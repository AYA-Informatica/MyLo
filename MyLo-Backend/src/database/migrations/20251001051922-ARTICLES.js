'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('articles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      lawId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'laws',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      articleNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('articles', ['lawId', 'articleNumber'], {
      name: 'articles_law_id_article_number_unique',
      unique: true,
    });

    await queryInterface.addIndex('articles', ['lawId'], {
      name: 'articles_law_id_index',
    });

    await queryInterface.addIndex('articles', ['articleNumber'], {
      name: 'articles_article_number_index',
    });

    await queryInterface.addIndex('articles', ['createdAt'], {
      name: 'articles_created_at_index',
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('articles');
  },
};