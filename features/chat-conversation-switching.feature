Feature: Conversation switching

  Scenario: Switching conversations shows the correct messages
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    And I seed two distinct conversations
    When I switch to the second conversation
    Then I should see "second thread unique text" in the chat area

  Scenario: Returning to the first conversation shows the first conversation messages
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    And I seed two distinct conversations
    When I switch back to the first conversation
    Then I should see "first thread unique text" in the chat area