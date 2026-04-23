Feature: Persona-based responses

  Scenario: User selects Miss Sweetheart and sees it applied in chat
    Given I am logged in
    And I am on the persona selection page
    When I choose the "sweetheart" persona
    And I enter the chat page
    Then I should see the persona name "Miss Sweetheart" in the typing indicator

  Scenario: User selects Mr. Professional and sees it applied in chat
    Given I am logged in
    And I am on the persona selection page
    When I choose the "professional" persona
    And I enter the chat page
    Then I should see the persona name "Mr. Professional" in the typing indicator

  Scenario: User selects Lord Silly The Ninth and sees it applied in chat
    Given I am logged in
    And I am on the persona selection page
    When I choose the "silly" persona
    And I enter the chat page
    Then I should see the persona name "Lord Silly The Ninth" in the typing indicator

    