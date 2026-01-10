/// <reference types="cypress" />

// ***********************************************
// Custom commands for Zignal Form Builder
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Add a field to the form builder
       * @example cy.addField('string', 'firstName')
       */
      addField(fieldType: string, fieldName?: string): Chainable<void>;

      /**
       * Configure a field
       * @example cy.configureField('firstName', { required: true })
       */
      configureField(fieldName: string, config: Record<string, unknown>): Chainable<void>;

      /**
       * Create a form group
       * @example cy.createGroup('Personal Info')
       */
      createGroup(groupName: string): Chainable<void>;

      /**
       * Switch to preview mode
       * @example cy.switchToPreview()
       */
      switchToPreview(): Chainable<void>;

      /**
       * Export form as JSON
       * @example cy.exportAsJSON()
       */
      exportAsJSON(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('addField', (fieldType: string, fieldName?: string) => {
  // Click on field type in left panel
  cy.get(`[data-field-type="${fieldType}"]`).click();

  // If field name provided, configure it
  if (fieldName) {
    cy.get('[data-field-name-input]').clear().type(fieldName);
  }
});

Cypress.Commands.add('configureField', (fieldName: string, config: Record<string, unknown>) => {
  // Select field
  cy.get(`[data-field="${fieldName}"]`).click();

  // Configure field properties
  Object.entries(config).forEach(([key, value]) => {
    cy.get(`[data-config="${key}"]`).then($el => {
      if ($el.is(':checkbox')) {
        if (value) cy.get(`[data-config="${key}"]`).check();
        else cy.get(`[data-config="${key}"]`).uncheck();
      } else {
        cy.get(`[data-config="${key}"]`).clear().type(String(value));
      }
    });
  });
});

Cypress.Commands.add('createGroup', (groupName: string) => {
  cy.get('[data-action="add-group"]').click();
  cy.get('[data-group-name-input]').type(groupName);
  cy.get('[data-action="save-group"]').click();
});

Cypress.Commands.add('switchToPreview', () => {
  cy.get('[data-tab="preview"]').click();
});

Cypress.Commands.add('exportAsJSON', () => {
  cy.get('[data-tab="export"]').click();
  cy.get('[data-export-format="json"]').click();
  cy.get('[data-action="copy-code"]').click();
});

export {};
