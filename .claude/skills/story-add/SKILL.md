---
name: story-add
description: Add a new story to the personal-site stories feature. Appends a typed entry to `javascripts/stories.js` in this repo. Use whenever the owner says "add a story", "new story", "story-add", or invokes /story-add.
argument-hint: [optional rough idea, url, or image path]
allowed-tools: Read Edit Write Bash(ls *) Bash(test *) AskUserQuestion
---

You add one story to the stories feed on this site. The data file is `javascripts/stories.js` (repo-relative) — it exports `window.STORIES = [ ... ]`. You append exactly one entry to that array.

## What a story is

Four types. Pick the one that fits the owner's intent. Each renders inside a 9:16 viewer.

| Type | Use for | Required | Optional |
|---|---|---|---|
| `image` | screenshot, photo, chart | `src` | `caption`, `duration`, `time` |
| `video` | YouTube / mp4 demo | `embed` OR `src` | `duration`, `time` |
| `link` | preview card linking out (blog, repo, post) | `url`, `title` | `eyebrow`, `desc`, `image`, `cta`, `duration`, `time` |
| `interactive` | poll | `question`, `options` (array) | `hint`, `duration`, `time` |

Defaults if owner doesn't specify: `duration: 5000` for image, `7000` for link, `8000` for video, `12000` for interactive. `time: 'today'` for new entries (free-form label like `'2d ago'`, `'1w ago'`).

## Workflow

1. **Parse $ARGUMENTS.** Owner's rough idea may include a YouTube URL, image path, blog URL, or just a description. Infer the type when obvious — don't ask if you already know.
2. **Pick type.** If ambiguous, ask once via `AskUserQuestion` with the four types as options. Otherwise pick and move on.
3. **Collect required fields per type.** Ask the minimum number of questions. Bundle into one `AskUserQuestion` call when possible.
   - For `image`: confirm the `src`. If owner gave a remote URL, ask whether to use the URL directly or wait for them to drop the file under `images/`. Verify path exists with `ls` when local.
   - For `video` with a YouTube URL: convert to embed form `https://www.youtube.com/embed/<ID>?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&enablejsapi=1&playsinline=1`. The `enablejsapi=1` and `mute=1` flags are required for autoplay + tap-to-unmute to work; do not drop them.
   - For `link`: ask for `title` if not provided. `desc` and `eyebrow` are nice-to-haves — only ask if the link card would feel empty without them.
   - For `interactive`: require `question` and at least 2 `options`.
4. **Decide position.** Default is to prepend (insert as first entry) so the new story shows first when the ring is tapped. Ask only if the owner said something that implies otherwise.
5. **Read `javascripts/stories.js`.** Use the `Read` tool — never assume the current state.
6. **Append with `Edit`.** Insert the new object literal at the chosen position in the array. Match the existing indentation (2 spaces) and trailing-comma style. Preserve all existing entries verbatim.
7. **Verify.** Re-read the file and confirm the new entry parses (count opening/closing braces, check for stray syntax). If unsure, ask the owner to reload and report back.
8. **Tell the owner what to do next.** One line: "Reload the site and tap your profile picture." If the site uses cache-busting query strings on assets (`?v=...`), remind them to bump the version in `index.html` so the new story shows in browsers that cached the old `stories.js`.

## Hard rules

- **One story per invocation.** If the owner wants multiple, tell them to re-run the skill.
- **Never edit `site.js` or `site.css`** — only `stories.js`.
- **Never invent media paths.** If the owner says "use my Tokyo photo" and you don't know where it is, ask.
- **Never silently change other entries.** Edits are appends only.
- **YouTube embeds:** always include `enablejsapi=1` and `mute=1`. Otherwise tap-to-unmute breaks or the video won't autoplay.
- **Don't write a brief, plan, or summary file.** This skill mutates one source file and stops.

## Templates

```js
// image
{
  type: 'image',
  duration: 5000,
  time: 'today',
  src: 'images/<file>',
  caption: '<one-line>'  // optional
}

// video (YouTube)
{
  type: 'video',
  duration: 8000,
  time: 'today',
  embed: 'https://www.youtube.com/embed/<ID>?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&enablejsapi=1&playsinline=1'
}

// video (self-hosted mp4)
{
  type: 'video',
  duration: 8000,
  time: 'today',
  src: 'videos/<file>.mp4'
}

// link
{
  type: 'link',
  duration: 7000,
  time: 'today',
  url: '<url>',
  eyebrow: '<kicker, optional>',
  title: '<title>',
  desc: '<one-or-two-line desc, optional>',
  image: 'images/<file>',  // optional preview
  cta: '<button label>'    // optional, default 'Open'
}

// interactive (poll)
{
  type: 'interactive',
  duration: 12000,
  time: 'today',
  question: '<question>',
  options: ['<a>', '<b>', '<c>'],
  hint: '<small grey hint, optional>'
}
```

End with one line telling the owner the entry was added and the next step (reload + bump cache version if needed).
