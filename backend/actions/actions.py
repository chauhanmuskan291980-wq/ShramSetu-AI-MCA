from typing import Any, Text, Dict, List

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet


# ---------------------------------------------------
# ACTION 1: Reset ESIC Slots
# ---------------------------------------------------

class ActionResetESICSlots(Action):

    def name(self) -> Text:
        return "action_reset_esic_slots"

    def run(self, dispatcher, tracker, domain):

        return [
            SlotSet("salary", None),
            SlotSet("employer_registered", None)
        ]


# ---------------------------------------------------
# ACTION 2: Check ESIC Eligibility
# ---------------------------------------------------

class ActionCheckESICEligibility(Action):

    def name(self) -> Text:
        return "action_check_esic_eligibility"

    def run(self, dispatcher, tracker, domain):

        salary = tracker.get_slot("salary")
        employer_registered = tracker.get_slot("employer_registered")
        lang = tracker.get_slot("lang")

        if salary is None or employer_registered is None:
            dispatcher.utter_message(
                text="I need both salary and employer registration details."
            )
            return []

        salary = float(salary)

        # Salary rule
        if salary > 21000:

            if lang == "hi":
                dispatcher.utter_message(
                    text="आप ESIC के लिए पात्र नहीं हैं क्योंकि आपकी सैलरी ₹21,000 से अधिक है।"
                )
            else:
                dispatcher.utter_message(
                    text="You are NOT eligible for ESIC because your salary exceeds ₹21,000."
                )

            return []

        # Employer not registered
        if employer_registered is False:

            if lang == "hi":
                dispatcher.utter_message(
                    text="आप ESIC के लिए पात्र हैं लेकिन आपका नियोक्ता पंजीकृत नहीं है।",
                    buttons=[
                        {
                            "title": "शिकायत पत्र बनाएं",
                            "payload": "/generate_complaint"
                        }
                    ]
                )
            else:
                dispatcher.utter_message(
                    text="You are eligible for ESIC but your employer is not registered.",
                    buttons=[
                        {
                            "title": "Generate Complaint Letter",
                            "payload": "/generate_complaint"
                        }
                    ]
                )

            return []

        # Fully eligible
        if lang == "hi":
            dispatcher.utter_message(
                text=(
                    "आप ESIC के लिए पात्र हैं और आपको निम्नलिखित लाभ मिल सकते हैं:\n"
                    "1️⃣ चिकित्सा सुविधा (Medical Benefits)"
                    "2️⃣ बीमारी भत्ता (Sickness Benefit)"
                    "3️⃣ मातृत्व लाभ (Maternity Benefit)"
                    "4️⃣ दुर्घटना लाभ (Disablement Benefit)"
                    "5️⃣ आश्रित लाभ (Dependants Benefit)"
                    "6️⃣ अंतिम संस्कार सहायता (Funeral Expenses)"
                )
            )
        else:
            dispatcher.utter_message(
                text=(
                    "You are eligible for ESIC. You can receive the following benefits:\n"
                    "1️⃣ Medical Benefits\n"
                    "2️⃣ Sickness Benefit\n"
                    "3️⃣ Maternity Benefit\n"
                    "4️⃣ Disablement Benefit\n"
                    "5️⃣ Dependants Benefit\n"
                    "6️⃣ Funeral Expenses"
                )
            )

        return []


# ---------------------------------------------------
# ACTION 3: Calculate PF
# ---------------------------------------------------

class ActionCalculatePF(Action):

    def name(self):
        return "action_calculate_pf"

    def run(self, dispatcher, tracker, domain):

        basic_salary = tracker.get_slot("basic_salary")
        lang = tracker.get_slot("lang")

        if basic_salary is None:

            if lang == "hi":
                dispatcher.utter_message(text="कृपया अपनी बेसिक सैलरी दर्ज करें।")
            else:
                dispatcher.utter_message(text="Please provide your basic salary.")

            return []

        basic_salary = float(basic_salary)

        employee = basic_salary * 0.12
        employer = basic_salary * 0.12
        total = employee + employer

        if lang == "hi":

            dispatcher.utter_message(
                text=
                f"बेसिक सैलरी: ₹{basic_salary}\n"
                f"कर्मचारी अंशदान: ₹{employee}\n"
                f"नियोक्ता अंशदान: ₹{employer}\n"
                f"कुल PF: ₹{total}"
            )

        else:

            dispatcher.utter_message(
                text=
                f"Basic Salary: ₹{basic_salary}\n"
                f"Employee Contribution: ₹{employee}\n"
                f"Employer Contribution: ₹{employer}\n"
                f"Total PF: ₹{total}"
            )

        return []


# ---------------------------------------------------
# ACTION 4: Reset PF Slot
# ---------------------------------------------------

class ActionResetPFSlot(Action):

    def name(self) -> Text:
        return "action_reset_pf_slot"

    def run(self, dispatcher, tracker, domain):

        return [SlotSet("basic_salary", None)]


# ---------------------------------------------------
# GRATUITY RESET
# ---------------------------------------------------

class ActionResetGratuitySlots(Action):

    def name(self):
        return "action_reset_gratuity_slots"

    def run(self, dispatcher, tracker, domain):

        return [
            SlotSet("last_drawn_salary", None),
            SlotSet("years_of_service", None)
        ]


# ---------------------------------------------------
# GRATUITY CALCULATION
# ---------------------------------------------------

class ActionCalculateGratuity(Action):

    def name(self):
        return "action_calculate_gratuity"

    def run(self, dispatcher, tracker, domain):

        salary = float(tracker.get_slot("last_drawn_salary"))
        years = float(tracker.get_slot("years_of_service"))
        lang = tracker.get_slot("lang")

        if years < 5:

            if lang == "hi":
                dispatcher.utter_message(
                    text="ग्रेच्युटी के लिए कम से कम 5 वर्ष की सेवा आवश्यक है।"
                )
            else:
                dispatcher.utter_message(
                    text="Minimum 5 years service required for gratuity."
                )

            return []

        gratuity = (salary * 15 * years) / 26

        if lang == "hi":

            dispatcher.utter_message(
                text=f"आपकी ग्रेच्युटी राशि ₹{gratuity} है।"
            )

        else:

            dispatcher.utter_message(
                text=f"Your gratuity amount is ₹{gratuity}"
            )

        return []


# ---------------------------------------------------
# LANGUAGE DETECTION
# ---------------------------------------------------

class ActionDetectLanguage(Action):

    def name(self):
        return "action_detect_language"

    def run(self, dispatcher, tracker, domain):

        text = tracker.latest_message.get("text")

        if any('\u0900' <= ch <= '\u097F' for ch in text):
            return [SlotSet("lang", "hi")]

        return [SlotSet("lang", "en")]


# ---------------------------------------------------
# COMPLAINT LETTER
# ---------------------------------------------------

 
class ActionGenerateComplaint(Action):

    def name(self):
        return "action_generate_complaint"

    def run(self, dispatcher, tracker, domain):

        name = tracker.get_slot("employee_name")
        company = tracker.get_slot("employer_details")
        joining = tracker.get_slot("joining_date")
        lang = tracker.get_slot("lang")

        # ---------------- HINDI LETTER ----------------
        if lang == "hi":

            letter = f"""
सेवा में,
क्षेत्रीय निदेशक
कर्मचारी राज्य बीमा निगम (ESIC)
विषय: ESIC पंजीकरण न होने के संबंध में शिकायत।
महोदय/महोदया,
मेरा नाम {name} है। मैं {company} में {joining} से कार्य कर रहा/रही हूँ।
मेरी मासिक वेतन ESIC की पात्रता सीमा के अंतर्गत आती है। 
फिर भी मेरे नियोक्ता ने ESIC के अंतर्गत पंजीकरण नहीं कराया है।
अतः आपसे निवेदन है कि कृपया इस मामले की जांच कर उचित कार्रवाई करें।
धन्यवाद।
भवदीय,  
{name}
"""

        # ---------------- ENGLISH LETTER ----------------
        else:

            letter = f"""
To,
The Regional Director
Employees' State Insurance Corporation (ESIC)
Subject: Complaint Regarding Non-Registration Under ESIC
Respected Sir/Madam,
I, {name}, am employed at {company} since {joining}.
My monthly salary falls within the ESIC eligibility limit. 
However, my employer has not registered under ESIC.
Kindly investigate this matter and take necessary action.
Yours faithfully,
{name}
"""

        dispatcher.utter_message(text=letter)

        return []