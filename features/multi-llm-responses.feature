Feature: Multi-LLM replies

  Scenario: User receives parallel replies from multiple models
    Given I am logged in as "test@test.com" with password "12345678"
    And I open the new chat page
    When I set the active conversation models to "llama3.2:1b, llama3.2:3b"
    And I send "Compare these responses" in the current conversation
    Then I should see multiple AI replies
    And I should see model labels "llama3.2:1b" and "llama3.2:3b"
