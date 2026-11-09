# Prose patterns

Use these signals in context. Preserve technical meanings, labels, code, quotations,
and meaningful uncertainty. A useful statement is not filler merely because another
project could say it.

IDs are stable; never renumber or reuse them. Prefer editing existing rules. Add
only recurring problems with distinct remedies. Keep triggers and exceptions together.

## Meaning and evidence

**P01: Decorative participles: "highlighting," "ensuring," "showcasing," "fostering".** Remove unsupported flourish or state the actual effect. Keep participles describing verified behavior; do not turn possibilities into guarantees.

**P02: "Experts believe," "reports suggest," "critics argue".** Name the available source. Otherwise flag substantive unsupported claims; remove empty attribution. Never fabricate authority or convert opinion into fact.

**P03: "Robust," "seamless," "powerful," "easy," "fast"; brochure promises.** State supported behavior or measurements. Otherwise remove empty praise or flag missing evidence. "Runs quickly" is not improved by "is fast."

**P04: "Could potentially possibly," "significantly," "extremely," "very," "really," "actually," "basically," "quite," "totally," "literally," "definitely"; "kind of," "sort of," "type of," "somewhat," "seemingly," "-ish"; "particular," "specific," "individual," "certain," "any given," "for all intents and purposes"; "very unique".** Remove redundant hedges, intensifiers, empty qualifiers, and determiners that narrow nothing. Do not grade absolutes such as "unique." Replace "very + adjective" with a precise word or a supported measurement. Preserve probability, approximation, timing, and restrictions, and keep words that change the meaning: "completely" against "partly," "actually" correcting a stated misconception, "literally" for a literal string, "generally" for a real exception, "a specific version" naming one version. Confidence is not a substitute for accuracy.

**P05: "The future looks bright," "In today's fast-paced world"; generic openings and conclusions.** Open with the point the reader came for. End with a specific conclusion, decision, or action. Remove repetitive summaries; keep useful synthesis connecting findings or answering the reader's question.

## Word choice and framing

**P06: "Additionally," "crucial," "delve," "enduring," "enhance," "garner," "interplay," "intricate," "pivotal," "testament," "underscore," "vibrant".** Use familiar, precise words; remove ceremonial transitions. Keep necessary distinctions. Prefer "use" to "leverage," "help" to "facilitate," and "many" to "numerous" when equivalent.

**P07: Abstract "landscape," "tapestry," "substrate," "wedge," "vector," "locus," "vantage," "nexus," "primitive," "harness," "surface," "bedrock," "scaffolding," "modality," "paradigm," "gold-plating," "ratchet," "evacuate," "endgame," "north star," "flywheel".** Name the component, action, or constraint. Keep useful technical meanings, including vector arithmetic, primitive types, and API surface.

**P08: "Load-bearing," "honestly," "genuinely," "that matter".** Strong reconsideration signals: remove performative sincerity and unexplained importance. Name supported dependencies, criteria, or consequences. Preserve literal structural loads and substantive authenticity distinctions; quoted or code occurrences are protected.

**P09: "Serves as," "stands as," "boasts," "features".** Use "is" or "has" when equivalent; preserve distinctions in function or behavior.

**P10: "Not just X, but Y"; "This isn't X, it's Y".** State the point directly. Keep contrasts correcting likely misconceptions or distinguishing relevant alternatives.

**P11: Forced groups of three; false "from X to Y" ranges.** Use the natural number of ideas; list unrelated topics directly. Keep real scales, sequences, and ranges.

**P12: Synonym cycling; ambiguous "it," "this," "they".** Use one term per concept. Repeat nouns to prevent guessing; preserve distinctions between different concepts.

**P13: "In order to," "due to the fact that," "despite the fact that," "at this point in time," "for the purpose of," "it is important to note," "it goes without saying"; statements of the obvious; narrated detail the reader can supply.** Use "to," "because," "although," "now," "for," or the statement itself. Cut throat-clearing, restatements, and what this reader already knows. Preserve context affecting interpretation and steps a newcomer needs.

**P14: Aphorisms, clichés, personified code, "rides along," "a dial worth turning," "low-hanging fruit," "at the end of the day".** Prefer literal meaning to decorative metaphor, stock phrases, and fragments. Keep efficient explanatory analogies with clear limits.

## Sentences and presentation

**P15: Backtracking, distant subject and verb, unrelated clauses, sentences over about 25 words, exceptions before their rule.** Split unrelated ideas; keep conditions attached and before actions in instructions. State a rule before its exceptions, and end with what the reader should remember. Length is a signal to check, not a limit; preserve sentence connections.

**P16: Passive voice that obscures responsibility.** Name known actors when helpful. Keep passive voice when actor information is unavailable or less useful; never invent an actor.

**P17: Dropped articles, symbol-speak, unexplained abbreviations.** Restore articles and verbs: "The parser rejects the date and exits with code 2." Spell out an abbreviation at first use, or use the full term when it appears only once or twice. Keep conventional notation, well-known abbreviations such as API and URL, and scannable table entries.

**P18: Repeated em dashes or colon pivots.** Simplify overloaded sentences. Keep punctuation that clarifies syntax, including parentheses, lists, and examples; avoid mechanical substitutions.

**P19: Excessive bold; all caps or underlining for emphasis; labels that repeat their own text.** Use bold or italics sparingly for navigation or distinctions; reserve underlining for links. Remove "**Performance:** Performance improved..." repetition; keep lead-ins adding information and helping scanning.

**P20: Title case, decorative emoji, inconsistent quotes.** Prefer sentence case; remove decoration. Preserve exact titles, UI labels, and house style. Use straight quotes for code; avoid pointless typography changes.

**P21: "Certainly!" "I hope this helps!" "Let me know if..." "Found the smoking gun!".** Remove chatbot ceremony and unrequested offers; keep actual invitations, findings, or next actions relevant to the document.

**P22: "Great question!" "You're absolutely right!".** Address the substance without automatic praise. Preserve evaluations relevant as evidence.

## Concision and consistency

**P23: Redundant pairs, modifiers, and categories: "each and every," "first and foremost," "any and all," "knowledge and information," "basic fundamentals," "important essentials," "final outcome," "end result," "free gift," "unexpected surprise," "various differences," "true facts," "past history," "future plans," "completely finished," "unneeded luxury"; "large in size," "round in shape," "unusual in nature," "blue in color," "often times," "time period".** Keep the word that carries the meaning; a specific word already implies its category. Preserve quoted, legal, and contract wording, and pairs whose words differ in meaning.

**P24: Hidden verbs: "make a decision," "conduct an analysis," "perform validation," "provide an explanation of," "is dependent on," "is an impossibility," "the configuration of the".** Use the verb or adjective: decide, analyze, validate, explain, depends on, is impossible, configure. Keep the noun when it names a thing the reader works with, such as "the analysis report" or "garbage collection."

**P25: "There is/are ... that," "It is ... that," "It is ... to" openings.** Start with the real subject: "Three flags control retries." Keep an opening that states existence when existence is the point, such as "There is no undo."

**P26: Relative clauses that only describe: "the flag that is optional," "the file, which is large,".** Fold them into a modifier: "the optional flag." Keep clauses that restrict meaning or carry a condition, and keep "that" when dropping it could cause a misreading: "Verify that the token expires."

**P27: Noun strings: three or more nouns in a row, such as "token expiration policy configuration".** Unpack them with a verb or a preposition: "how to configure when tokens expire." Keep product names, identifiers, and established terms.

**P28: Mixed forms in parallel items; shifts in tense, person, or tone.** Give steps, list items, and same-level headings one grammatical form. Use present tense for behavior and past tense for events, "you" for the reader, and one tone throughout. Keep tense changes that report real changes in time.

**P29: "Shall," "and/or," slashes between alternatives.** Use "must" for requirements; replace "and/or" with "or," "and," or "X, Y, or both"; choose one alternative or write both. When the source does not say which alternative it means, especially between requirement strengths such as "shall/should," keep the wording and flag it rather than choosing. Keep "shall" where a standard or contract defines it, and keep slashes in paths, units, fractions, and established terms such as I/O.

Adapted from Lauren Tan, Unslop. Context and evidence checks replace blanket bans.
P23 through P29 and the added triggers in P04, P05, P13, P14, P15, P17, and P19
draw on the conciseness and clear-writing checklists credited in the writing principles.
The catalog also includes the user's preferences.
