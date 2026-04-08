Feature: Ollama graceful failure

  Scenario: Sending a message without local Ollama shows a helpful error
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    When I send "Hello without Ollama" in the current conversation
    Then I should see an Ollama failure message
    And the page should still be usable

  Scenario: Chat UI remains available after Ollama failure
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    When I send "Another failure test" in the current conversation
    Then I should see an Ollama failure message
    And I should still see the conversation list
    And I should still see the chat input field