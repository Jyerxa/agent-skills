# Writing principles

Apply these principles to reduce reader effort while preserving accurate meaning.
They are defaults, not quotas for sentence length, grade level, or number of sections.

## Organize the information

- **One primary purpose.** Choose content for the reader's goal. A useful explanation
  or small reference table can belong inside a how-to; mode purity is not the goal.
- **Essentials before depth.** Give the answer or main path before optional background,
  alternatives, and edge cases. A setup guide can show a working configuration before
  optional settings. Keep prerequisites, warnings, and limits where they affect an
  action or claim. Do not hide them in an appendix to make the main path shorter.
- **A connected sequence.** Introduce needed concepts before using them. Give each
  section a distinct contribution. Lead paragraphs with their main point and follow
  with reasons, evidence, or examples. Preserve connections between ideas when cutting.
- **Useful headings and formats.** Prefer "When to retry a failed request" to
  "Important considerations." Use steps for ordered actions and tables for useful
  comparisons. Keep prose when it explains relationships better than a list.

## Write the information

**Cut filler first.** Remove anything that adds reading effort without helping
understanding, from whole sections to individual words. "It is important to note
that the server requires a token" becomes "The server requires a token." Keep
examples and repeated nouns when they prevent guessing. Do not compress prose
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
| perform an analysis | analyze |

Keep "latency" if "slowness" loses precision; explain it when the reader needs that.
Do not replace exact UI labels, API names, or established technical terms for style.

**Make actor and action clear.** Keep the subject and main verb close together.
"Validation is performed by the server" becomes "The server validates the input"
when the input and actor are known. Passive voice can be clearer when the actor is
unknown or irrelevant. Never invent an actor to make a sentence active.

**Give each sentence one main job.** Split unrelated ideas. Keep a condition, reason,
or result with the statement it explains. "The server rejects the request if the
token has expired" need not be split into two sentences.

**Condition before action in instructions.** Prefer "If the connection fails,
restart the client" to the reverse order. For explanations, lead with the subject
the reader is trying to understand. Place modifiers precisely: "Return only failed
jobs" differs from "Only return failed jobs."

**One term per concept; clear references.** Do not alternate "job," "task," and
"operation" for variety when they mean the same thing. Repeat a noun if a pronoun
is ambiguous. "When the server restarts, the client disconnects" clarifies which
component restarts compared with "The client disconnects from the server when it
restarts."

**Concrete information, not vague praise.** Replace "robust," "easy," or "fast"
with relevant, supported behavior. "Retries failed requests up to three times"
is useful only if that behavior is verified. If specifics are unavailable, omit
the praise; preserve and label any substantive unresolved claim instead of hiding it.

**Direct statements with necessary qualifications.** "The command can run without
a path" is easier to follow than "A missing path won't prevent the command from
running." Keep real prohibitions such as "Do not delete the encryption key."
Preserve distinctions such as may/must, some/all, and optional/required. Use
"because" for cause when "since" could be mistaken for time.

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
