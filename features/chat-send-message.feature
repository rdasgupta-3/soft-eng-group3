Feature: Chat messaging

  Scenario: User sends a message and it appears in the chat area
    Given I am logged in as "test@test.com" with password "12345678"
    And I open the new chat page
    When I send "Hello from automated test" in the current conversation
    Then I should see "Hello from automated test" in the chat area

  Scenario: Empty message is not submitted
    Given I am logged in as "test@test.com" with password "12345678"
    And I open the new chat page
    When I attempt to send an empty chat message
    Then no new user message should be added
