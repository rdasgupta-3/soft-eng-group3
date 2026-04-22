Feature: Chat history UI

  Scenario: Chat page shows history controls
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    Then I should see the conversation list
    And I should see the new conversation button
    And I should see the history search field

  Scenario: Chat page shows message area and input controls
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    Then I should see the chat message area
    And I should see the chat input field
    And I should see the send button