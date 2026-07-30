'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('laws', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      lawNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      originId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'origins',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      domainId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'domains',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM('Active', 'Amended', 'Repealed'),
        allowNull: false,
        defaultValue: 'Active',
      },
      language: {
        type: Sequelize.ENUM('EN', 'RW', 'FR'),
        allowNull: false,
        defaultValue: 'EN',
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
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

    await queryInterface.addIndex('laws', ['lawNumber'], {
      name: 'laws_law_number_index',
      unique: true,
    });

    await queryInterface.addIndex('laws', ['originId'], {
      name: 'laws_origin_id_index',
    });

    await queryInterface.addIndex('laws', ['domainId'], {
      name: 'laws_domain_id_index',
    });

    await queryInterface.addIndex('laws', ['status'], {
      name: 'laws_status_index',
    });

    await queryInterface.addIndex('laws', ['language'], {
      name: 'laws_language_index',
    });

    await queryInterface.addIndex('laws', ['publishedAt'], {
      name: 'laws_published_at_index',
    });

    await queryInterface.addIndex('laws', ['createdAt'], {
      name: 'laws_created_at_index',
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Laws');
  },
};
