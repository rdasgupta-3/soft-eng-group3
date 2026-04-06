Feature: Protected routes and APIs
    
    Scenario: Unauthenticated user cannot access chat page
        Given I open a fresh browser session
        When I navigate directly to the chat page
        Then I should be redirected away from the chat page
    
    Scenario: Unauthenticated user cannot access conversations API
        Given I open a fresh browser session
        When I request the conversations API directly
        Then the conversations API response should be unauthorized

    