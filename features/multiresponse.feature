Feature: Multi-LLM response comparison

Scenario: Displaying responses from three LLM models
    Given I am logged in
    And I am on the chat page
    When I enter "Explain kinetic energy" into the message box
    And I press "Send"
    Then I should see three distinct responses
    And each response should indicate which model produced it 

Scenario: Selecting a preferred model for continued conversation
    Given I have received responses from multiple models
    When I choose one of the models as my preferred model
    Then future replies should come only from that model

Scenario: One model fails to respond
    Given I am on the chat page
    When I send a prompt
    And one of the models fails to respond
    Then I should see an error message for that model
    And I should still see responses from the other models