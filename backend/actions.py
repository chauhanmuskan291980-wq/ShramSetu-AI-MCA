from typing import Any, Text, Dict, List

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet


class ActionResetESICSlots(Action):
    def name(self) -> Text:
        return "action_reset_esic_slots"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        # Clear previously stored values so every new eligibility check is fresh
        return [SlotSet("salary", None), SlotSet("employer_registered", None)]


class ActionCheckESICEligibility(Action):
    def name(self) -> Text:
        return "action_check_esic_eligibility"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:

        salary = tracker.get_slot("salary")
        employer_registered = tracker.get_slot("employer_registered")

        if salary is None or employer_registered is None:
            dispatcher.utter_message(
                text="I need both salary and employer registration details to check eligibility."
            )
            return []

        salary = float(salary)

        # ---- RULE 1: Wage Rule (Prototype) ----
        if salary > 21000:
            dispatcher.utter_message(
                text="You are NOT eligible for ESIC because your salary exceeds ₹21,000."
            )
            return []

        # ---- RULE 4: Employer Registration (Activation) ----
        if employer_registered is False:
            dispatcher.utter_message(
                text="You are legally eligible for ESIC, but your employer is not registered. Benefits cannot be activated. You may file a complaint."
            )
            return []

        # ---- Eligible Case ----
        dispatcher.utter_message(text="You are eligible for ESIC.")
        return []

        