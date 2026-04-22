Feature: Three provider responses
  As a user prompting an LLM
  So that I can compare different models
  I want to see three different responses for the same prompt

  Scenario: A prompt returns GPT, Gemini, and Claude-style answers
    Given I have a registered solo iteration account
    And I am logged in on the chat page with the "sweetheart" persona
    When I send the prompt "Give me three study tips for a software engineering class"
    Then I should see a response card for "GPT"
    And I should see a response card for "Gemini"
    And I should see a response card for "Claude"
    And each latest response card should contain generated text
