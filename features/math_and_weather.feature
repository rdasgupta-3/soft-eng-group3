@iteration3
Feature: Math and Weather Queries
  As a user
  I want to ask math and weather questions to the backend LLMs
  So I can evaluate their reasoning and real-time capabilities

  Scenario: Asking a math question
    Given I am logged in as "test@test.com" with password "123456"
    And I am on the Triad.ai chat interface
    When I type the prompt "What is the square root of 144?" into the chat input
    And I click the send message button
    Then I should see my message "What is the square root of 144?" in the chat window
    And the AI should generate a reply bubble

  Scenario: Asking a weather question
    Given I am logged in as "test@test.com" with password "123456"
    And I am on the Triad.ai chat interface
    When I type the prompt "What is the current weather in Tokyo?" into the chat input
    And I click the send message button
    Then I should see my message "What is the current weather in Tokyo?" in the chat window
    And the AI should generate a reply bubble

Scenario: Asking a time question
    Given I am logged in as "test@test.com" with password "123456"
    And I am on the Triad.ai chat interface
    When I type the prompt "What time is it right now?" into the chat input
    And I click the send message button
    Then I should see my message "What time is it right now?" in the chat window
    And the AI should generate a reply bubble