import { defineConfig } from 'astro/config';

import AutoImport from 'astro-auto-import';

import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax/svg';

import mdx from "@astrojs/mdx";
import svelte from '@astrojs/svelte';
import { remarkSectionTransform } from './src/remark-section-transform.mjs';
import { remarkCodeTransform } from './src/remark-code-transform.mjs';

export default defineConfig({
    integrations: [
        AutoImport({
            imports: [
                './src/components/Section.astro',
                './src/components/SubSection.astro',
                './src/components/SubSubSection.astro',
                './src/components/SubSubSubSection.astro',
                './src/components/CalloutCard.astro',
                './src/components/CalloutContainer.astro',
                './src/components/Result.astro',
                './src/components/CodeBox.astro',
            ],
        }),
        svelte(),
        mdx(),
    ],
    image: {
        layout: 'full-width',
        responsiveStyles: true,
    },
    markdown: {
        remarkPlugins: [
            [
                remarkMath,
                {
                    singleDollarTextMath: true,
                }
            ],
            remarkSectionTransform,
            remarkCodeTransform,
        ],
        rehypePlugins: [[
            rehypeMathjax,
            {
                tex: {
                    tags: 'ams',
                    inlineMath: [
                        ["$", "$"],
                        ["\\(", "\\)"],
                    ],
                    displayMath: [
                        ["$$", "$$"],
                        ["\\[", "\\]"],
                    ],
                    processEscapes: true,
                    processRefs: true,
                },
            },
        ]],
        extendDefaultPlugins: true,
    },
});