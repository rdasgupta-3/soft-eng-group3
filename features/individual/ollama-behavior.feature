Feature: Ollama chat behavior
  As a user
  So that I can understand whether live chat responses are available
  I want the workspace to handle online, offline, and animated response states clearly

  Scenario: An online chat session warms up Ollama and shows the thinking/typewriter experience
    Given I have a registered solo iteration account
    And I am on the persona selection page with my account
    When I track Ollama warmup requests
    And I choose the "professional" persona from the selection page
    Then the chat workspace should be ready for prompts
    And a warmup request should have been made
    When I simulate a delayed AI reply
    And I send the prompt "Explain source control in one short paragraph" without waiting
    Then I should see the thinking indicator while waiting for responses
    And the latest response cards should animate into view

  Scenario: An offline chat session shows the warning banner and disables input
    Given I have a registered solo iteration account
    And I am on the persona selection page with my account
    When I simulate Ollama being offline
    And I choose the "silly" persona from the selection page
    Then I should see the Ollama offline warning
    And the chat input should be disabled
