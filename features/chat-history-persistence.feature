Feature: Chat history persistence

  Scenario: Messages persist after refresh
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    When I send "persistent test message" in the current conversation
    And I refresh the browser
    Then I should still see "persistent test message" in the chat area

  Scenario: Conversation list persists after refresh
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    And I seed a first conversation
    When I refresh the browser
    Then I should still see the prior conversation entry