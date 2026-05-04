@iteration3
Feature: Backend LLM Selection
  As a user
  I want to select different backend LLMs
  So I can use local small models or public models like GPT and Gemini

  Scenario: Switching to a public model
    Given I am logged in as "test@test.com" with password "123456"
    And I am on the Triad.ai chat interface
    When I click the "Choose Models" button
    And I select "Gemini 2.0 Flash" from the catalog
    Then the active model status should update to include "Gemini 2.0 Flash"

Scenario: Switching to a local small model
    Given I am logged in as "test@test.com" with password "123456"
    And I am on the Triad.ai chat interface
    When I click the "Choose Models" button
    And I select "Llama" from the catalog 
    Then the active model status should update to include "Llama"