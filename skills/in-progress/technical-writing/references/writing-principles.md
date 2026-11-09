# Writing principles

Apply these principles to reduce reader effort while preserving accurate meaning.
They are defaults, not quotas for sentence length, grade level, or number of sections.
Where a principle names a number, treat it as a signal to look again, not a limit.

## Organize the information

- **One primary purpose.** Choose content for the reader's goal. A useful explanation
  or small reference table can belong inside a how-to; mode purity is not the goal.
  Select the few points the reader needs and the details that support each; cut or
  move the rest. A section with more than about five key points may need splitting.
- **Essentials before depth.** Give the answer or main path before optional background,
  alternatives, and edge cases. A setup guide can show a working configuration before
  optional settings. Keep prerequisites, warnings, and limits where they affect an
  action or claim. Do not hide them in an appendix to make the main path shorter.
- **A connected sequence.** Introduce needed concepts before using them. Give each
  section a distinct contribution. Lead paragraphs with their main point and follow
  with reasons, evidence, or examples. Drafts often state the main point best at the
  end; move it to the start. Give each paragraph one topic; a paragraph longer than
  about five sentences often holds two. Preserve connections between ideas when cutting.
- **Useful headings and formats.** Prefer "When to retry a failed request" to
  "Important considerations." Use steps for ordered actions, tables for useful
  comparisons, and an if-then table when actions depend on conditions. Keep prose
  when it explains relationships better than a list. Introduce a list with a lead-in
  sentence. A list longer than about seven items may need grouping, and a list nested
  inside a list is often clearer as a table or a separate list.
- **Parallel form.** Give list items, steps, and headings at the same level the same
  grammatical form. Start every step with an imperative verb; make headings all tasks
  ("Rotate the key") or all topics ("Key rotation"), not a mix.
- **Images that inform.** Add a diagram or screenshot only when it shows something
  text cannot, such as a flow, a layout, or where a control is. Do not show a practice
  the reader should avoid unless it is clearly labeled as wrong.

## Write the information

**Cut filler first.** Remove anything that adds reading effort without helping
understanding, from whole sections to individual words. "It is important to note
that the server requires a token" becomes "The server requires a token." Cut:

- What this reader already knows or can infer, and detail that does not serve the
  purpose. "My flight was delayed three hours" can replace the story of the trip.
  Judge "obvious" by the reader, not the author: keep steps a newcomer needs.
- Intensifiers, empty qualifiers, and empty determiners, such as "very," "really,"
  "actually," "basically," "quite," "kind of," "somewhat," "type of," "particular,"
  and "for all intents and purposes," when they do not change the meaning. Replace
  "very + adjective" with a precise word or a supported measurement, and do not grade
  absolutes: "unique," not "very unique."
- Redundant pairs and categories: "each and every," "first and foremost,"
  "knowledge and information," "end result," "free gift," "large in size," "round
  in shape," "time period." A specific word already implies its category.
- Phrases that say what one word says: "at this point in time" becomes "now."

Keep examples and repeated nouns when they prevent guessing. Do not compress prose
into fragments or remove articles and connecting words just to shorten it.

**Choose familiar, precise words.** Use these substitutions only when the meaning
stays the same:

| Instead of | Prefer |
| --- | --- |
| utilize | use |
| commence | start |
| prior to | before |
| subsequent to | after |
| in the event that | if |
| despite the fact that | although |
| at this point in time | now |
| is able to | can |
| perform an analysis | analyze |
| make a decision | decide |

Keep "latency" if "slowness" loses precision; explain it when the reader needs that.
Do not replace exact UI labels, API names, or established technical terms for style.
Spell out an abbreviation the reader may not know at first use. If it appears only
once or twice, use the full term or a short name such as "the service" instead.

**Make actor and action clear.** Keep the subject, verb, and object close together.
"Validation is performed by the server" becomes "The server validates the input"
when the input and actor are known. Passive voice can be clearer when the actor is
unknown or irrelevant. Never invent an actor to make a sentence active.

- Use the verb hidden in a noun. "Make a decision" becomes "decide," and "the
  validation of the input" becomes "validate the input." Hidden verbs often end in
  -tion, -ment, -sion, or -ance, follow verbs such as make, give, have, or perform,
  or sit between "the" and "of."
- Start with the real subject. "There are three flags that control retries" becomes
  "Three flags control retries."
- Break up strings of three or more nouns. "Token expiration policy configuration"
  becomes "how to configure when tokens expire." Keep established names and identifiers.

**Give each sentence one main job.** Split unrelated ideas. Keep a condition, reason,
or result with the statement it explains. "The server rejects the request if the
token has expired" need not be split into two sentences. A sentence longer than about
25 words often holds more than one job; check it before keeping it.

**Order each sentence for the reader.** In instructions, put the condition before the
action: prefer "If the connection fails, restart the client" to the reverse order.
In explanations, lead with the subject the reader is trying to understand. State a
rule before its exceptions: "Jobs retry three times unless they set `retries`" reads
better than an opening "Except for...". End a sentence with what the reader should
carry forward; readers give the end of a sentence the most weight. Place modifiers
precisely: "Return only failed jobs" differs from "Only return failed jobs."

**One term per concept; clear references.** Do not alternate "job," "task," and
"operation" for variety when they mean the same thing. Repeat a noun if a pronoun
is ambiguous. "When the server restarts, the client disconnects" clarifies which
component restarts compared with "The client disconnects from the server when it
restarts."

**Keep tense, person, and tone consistent.** Use the present tense for how things
work ("The command prints the key ID") and the past tense for events, such as an
incident timeline. Address the reader as "you" in instructions, and use "we" only
for a named team or organization. Common contractions such as "don't" and "it's"
are fine unless house style forbids them; spell out "do not" when a warning needs
the emphasis. Do not shift between formal and casual tone within a document.

**Concrete information, not vague praise.** Replace "robust," "easy," or "fast"
with relevant, supported behavior. "Retries failed requests up to three times"
is useful only if that behavior is verified. If specifics are unavailable, omit
the praise; preserve and label any substantive unresolved claim instead of hiding it.

**Direct statements with necessary qualifications.** "The command can run without
a path" is easier to follow than "A missing path won't prevent the command from
running." Keep real prohibitions such as "Do not delete the encryption key."
Preserve distinctions such as may/must, some/all, and optional/required. Use
"must" for requirements rather than "shall," except in text that defines "shall"
or follows a standard that uses it. Replace "and/or" with "or," "and," or "X, Y,
or both." Use "because" for cause when "since" could be mistaken for time.

## Sources and adaptations

Daniele Procida, Diátaxis: reader needs and documentation modes. The primary-purpose
approach here deliberately relaxes strict separation of modes.

Google, Developer documentation style guide: plain language, conditions before
instructions, consistent terminology, paragraphs, and useful headings.

ASD Simplified Technical English Maintenance Group, ASD-STE100: precise vocabulary
and controlled meanings. These principles do not implement its full dictionary or
claim STE compliance.

Microsoft, Writing Style Guide: precise verbs, ambiguous words, and concise
sentences. Clarity takes priority over its blanket preference for shorter text.

NCEH/ATSDR Office of Communication, Clear Writing Checklist: key points, paragraph
and list design, hidden verbs, noun strings, "must" over "shall," slashes, sentence
order, and stress at the end of a sentence. Its sentence, paragraph, list, and
acronym counts become review signals here, not limits.

George Gopen and Judith Swan, The Science of Scientific Writing, as cited by that
checklist: readers weight the end of a sentence.

Purdue Online Writing Lab, Eliminating Words; San José State University Writing
Center, Eliminating Wordiness; Candace Osmond, Grammarist, 11 Tips for Editing Your
Own Writing; Jane Rosenzweig, Writing Hacks, The (Editing) Checklist Manifesto:
filler, redundant pairs and categories, wordy phrases, hidden verbs, expletive
openings, parallelism, consistent tense and tone, and editing from the big picture
down to mechanics. Their advice to vary words for style is not adopted, because
technical readers rely on one term per concept. Their advice to drop articles and
"that" is not adopted where it would make sentences harder to parse.
