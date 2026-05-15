// // Stories data — edit this array to add, remove, or reorder stories.
// // Types: 'image' | 'video' | 'link' | 'interactive'.
// // Required fields per type:
// //   image:       src, [caption], [duration], [time]
// //   video:       embed OR src, [duration], [time]    // embed must include enablejsapi=1 for unmute to work
// //   link:        url, title, [eyebrow], [desc], [image], [cta], [duration], [time]
// //   interactive: question, options[], [hint], [duration], [time]
// // `duration` is ms (default 5000). `time` is a free-form label like "2d ago".
// window.STORIES = [
//   {
//     type: 'image',
//     duration: 5000,
//     time: '2d ago',
//     src: 'images/stickiness.png',
//     caption: 'Reliance enterprise rollout — 86 WAU / 142 MAU in Jul \'25.'
//   },
//   {
//     type: 'link',
//     duration: 7000,
//     time: '5d ago',
//     url: 'https://youtu.be/N4JE-jT3VMM',
//     eyebrow: 'Featured',
//     title: 'An AI system of insights from daily journaling',
//     desc: 'LLM-tagged Google Docs entries, weekly flashbacks by email, PostHog dashboards.',
//     image: 'images/profile.jpg',
//     cta: 'Watch the walkthrough'
//   },
//   {
//     type: 'video',
//     duration: 8000,
//     time: '1w ago',
//     embed: 'https://www.youtube.com/embed/N4JE-jT3VMM?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&enablejsapi=1&playsinline=1'
//   },
//   {
//     type: 'interactive',
//     duration: 12000,
//     time: 'today',
//     question: 'Where should I post next?',
//     options: ['Voice agents teardown', 'Stories on a static site', 'Granola → Obsidian flow'],
//     hint: 'Pick one — dummy poll, votes stay in your browser.'
//   }
// ];
