# Notice Transport Grammar - Formal EBNF Specification

## 1. Core Event Grammar

```
<administrative-event> ::= <notice-event> | <response-event> | <default-event> | <certificate-event>

<event-identifier> ::= <event-type> "-" <timestamp> "-" <unique-id>
<timestamp> ::= <date> "T" <time> "Z"
<date> ::= <year> "-" <month> "-" <day>
<time> ::= <hour> ":" <minute> ":" <second>
```

## 2. Notice Grammar

```
<notice> ::= <notice-header> <notice-body> <notice-signature>

<notice-header> ::= "NOTICE" <newline> <notice-date> <newline> <from-party> <newline> <to-party> <newline> <notice-subject>

<notice-date> ::= <month> <day> "," <year> "•" <time>

<from-party> ::= "From:" <entity-name>
<to-party> ::= "To:" <recipient-name> <newline> <recipient-address>?

<notice-subject> ::= "Subject:" <notice-type> "-" <reference-number>

<notice-body> ::= <preamble> <statement-of-facts>* <demand-statement> <deadline-statement>

<preamble> ::= "PLEASE TAKE NOTICE" <newline> | "NOTICE IS HEREBY GIVEN" <newline>

<statement-of-facts> ::= <fact-paragraph> | <affidavit-reference>

<demand-statement> ::= "DEMAND IS HEREBY MADE" <newline> <demand-text>

<deadline-statement> ::= "Response required within:" <number> "days" <deadline-date>

<notice-signature> ::= <signature-line> <print-name> <title> <date>
```

## 3. Conditional Acceptance Grammar

```
<conditional-acceptance> ::= <ca-header> <reference-section> <acceptance-statement> <conditions-section> <closing-statement> <deadline> <ca-signature>

<ca-header> ::= "CONDITIONAL ACCEPTANCE"

<reference-section> ::= "Reference:" <notice-reference> <newline>

<acceptance-statement> ::= "I hereby conditionally accept your offer to contract upon full performance of the following conditions:"

<conditions-section> ::= "Upon full performance of:" <condition-list>

<condition-list> ::= <condition> | <condition> "," <condition-list>

<condition> ::= <number> "." <condition-text>

<closing-statement> ::= "This matter will be considered closed, settled, and finalized upon full performance."

<deadline> ::= "Response required within:" <number> "days" <deadline-date>
```

## 4. Notice of Fault Grammar

```
<notice-of-fault> ::= <nof-header> <fault-reference> <fault-identification> <cure-period> <nof-signature>

<nof-header> ::= "NOTICE OF FAULT AND OPPORTUNITY TO CURE"

<fault-reference> ::= "Reference:" <original-notice-reference>

<fault-identification> ::= <fault-description>+ | "Your notice fails to include:"

<fault-description> ::= <number> "." <fault-item>

<fault-item> ::= "Missing verification under penalty of perjury"
               | "No affidavit of truth supporting claims"
               | "Missing notarized affidavit"
               | "Failure to state claim with particularity"
               | "No supporting documentation attached"

<cure-period> ::= "You have" <number> "days to cure these faults." <cure-deadline>
```

## 5. Certificate of Service Grammar

```
<certificate-of-service> ::= <cos-header> <certification-statement> <delivery-method> <recipient-info> <service-date> <cos-signature>

<cos-header> ::= "CERTIFICATE OF SERVICE"

<certification-statement> ::= "I hereby certify that a true and correct copy of the foregoing document was served on"

<delivery-method> ::= <certified-mail> | <email-service> | <hand-delivery>

<certified-mail> ::= "Certified Mail" <tracking-number> "to" <recipient-address>

<email-service> ::= "Email" <email-address> "with read receipt confirmation"

<hand-delivery> ::= "Hand delivery to" <recipient-address>

<recipient-info> ::= <recipient-name> "," <recipient-address>

<service-date> ::= "on" <month> <day> "," <year>

<cos-signature> ::= <signature-line> <print-name> <title>
```

## 6. Response Grammar

```
<response> ::= <response-header> <reference-section> <response-body> <response-signature>

<response-header> ::= <response-type>

<response-type> ::= "RESPONSE: ACCEPTANCE"
                  | "RESPONSE: REBUTTAL"
                  | "RESPONSE: COUNTER-NOTICE"
                  | "RESPONSE: OBJECTION"

<reference-section> ::= "Reference:" <notice-reference>

<response-body> ::= <acceptance-body> | <rebuttal-body> | <counter-notice-body>

<acceptance-body> ::= "I accept your notice in its entirety." <acceptance-details>?

<rebuttal-body> ::= "I hereby rebut your notice on the following grounds:" <rebuttal-points>

<rebuttal-points> ::= <rebuttal-point> | <rebuttal-point> <rebuttal-points>

<rebuttal-point> ::= <number> "." <rebuttal-text> <supporting-citation>?

<counter-notice-body> ::= <counter-notice-header> <counter-claims> <demand-statement>

<counter-notice-header> ::= "COUNTER-NOTICE is hereby served regarding your reference:" <original-reference>

<counter-claims> ::= "Your notice contains the following defects:" <defect-list>

<defect-list> ::= <defect> | <defect> "," <defect-list>
```

## 7. Default Grammar

```
<default-declaration> ::= <default-header> <background> <default-statement> <consequences> <default-signature>

<default-header> ::= "DECLARATION OF DEFAULT BY ACQUIESCENCE"

<background> ::= "Reference:" <original-notice> <newline> "Notice served:" <service-date> <newline> "Deadline for response:" <deadline>

<default-statement> ::= "The above-referenced notice has not been responded to within the required time period. By failure to respond, the recipient has acquiesced to all claims and demands."

<consequences> ::= "By this default, the following matters are now established as fact:" <consequence-list>

<consequence-list> ::= <consequence> | <consequence> <consequence-list>

<consequence> ::= <number> "." <consequence-text>

<default-signature> ::= <affiant-statement> <notary-jurat>
```

## 8. Event Chain Grammar

```
<event-chain> ::= <root-event> <event-response>*

<event-response> ::= <response-to-notice> | <default-by-acquiescence>

<response-to-notice> ::= <notice> <response> <counter-notice>?

<default-by-acquiescence> ::= <notice> <default-declaration>

<chain-status> ::= "Open" | "Closed" | "Defaulted" | "In Litigation"
```

## 9. Transport Protocol Grammar

```
<transport-event> ::= <send-event> | <receive-event> | <acknowledge-event>

<send-event> ::= "SEND:" <event-type> <event-id> "TO:" <recipient-id> "METHOD:" <delivery-method> "TIMESTAMP:" <timestamp>

<receive-event> ::= "RECEIVE:" <event-type> <event-id> "FROM:" <sender-id> "TIMESTAMP:" <timestamp>

<acknowledge-event> ::= "ACK:" <event-id> "STATUS:" <ack-status> "TIMESTAMP:" <timestamp>

<ack-status> ::= "Accepted" | "Rejected" | "Pending" | "Defaulted"

<delivery-method> ::= "Certified Mail" | "Email" | "Hand Delivery" | "Fax"

<proof-of-delivery> ::= <tracking-number> | <read-receipt> | <affidavit-of-service>
```

## 10. Metadata Grammar

```
<event-metadata> ::= <event-id> <event-type> <timestamp> <chain-id> <parent-event-id>? <status>

<status> ::= "Draft" | "Sent" | "Delivered" | "Accepted" | "Rejected" | "Defaulted" | "Archived"

<chain-id> ::= "CHAIN-" <timestamp> "-" <sequence-number>

<parent-event-id> ::= <event-id> | null
```

## Terminal Symbols

```
<newline> ::= "\n"

<entity-name> ::= <string> ; Legal entity or person name

<recipient-name> ::= <string> ; Recipient's name

<recipient-address> ::= <street-address> "," <city> "," <state> <zip-code>

<street-address> ::= <number> <street-name> <street-type>

<month> ::= "January" | "February" | "March" | "April" | "May" | "June"
           | "July" | "August" | "September" | "October" | "November" | "December"

<day> ::= <number> ; 1-31

<year> ::= <number> ; 4-digit year

<number> ::= <digit>+ ; Positive integer

<digit> ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

<string> ::= <character>+ ; Any printable characters

<notice-type> ::= "Conditional Acceptance" | "Notice of Fault" | "Affidavit of Truth"
                | "Certificate of Service" | "Default Declaration" | "Counter-Notice"

<reference-number> ::= <prefix> "-" <sequence> "-" <year>

<prefix> ::= "NOTICE" | "CA" | "NOF" | "COS" | "DD" | "CN"

<sequence> ::= <digit>{6}

<unique-id> ::= <hex>{32} | <uuid>

<hex> ::= <digit> | "a" | "b" | "c" | "d" | "e" | "f"

<uuid> ::= <hex>{8} "-" <hex>{4} "-" <hex>{4} "-" <hex>{4} "-" <hex>{12}
```
