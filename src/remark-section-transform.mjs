// src/plugins/remark-section-transform.mjs
import { visit } from 'unist-util-visit';
import { findAfter } from 'unist-util-find-after';
import _ from 'lodash';

/**
 * Remark plugin that transforms headings into flat Section components.
 * - h1 → Section
 * - h2 → SubSection  
 * - h3 → SubSubSection
 * - h4 → SubSubSubSection
 * 
 * Creates flat (non-nested) components - each heading and its content
 * becomes a separate component at the same level.
 */
export function remarkSectionTransform() {
  return (tree, file) => {
    // Create empty table of contents
    const toc = [];

    // Make sure astro exists
    if (!file.data.astro) {
      file.data.astro = {};
    }

    // Make sure frontmatter exists
    if (!file.data.astro.frontmatter) {
      file.data.astro.frontmatter = {};
    }

    // Process all heading depths (1-4) in a single pass
    // We'll handle them all together to create flat structure
    visit(
      tree,
      node => node.type === 'heading' && node.depth >= 1 && node.depth <= 4,
      (node, index, parent) => sectionizeToComponent(node, index, parent, toc)
    );

    // Add table of contents to frontmatter
    file.data.astro.frontmatter.toc = nestHeadings(toc);
  };
}

/**
 * Convert a heading and its following content into the appropriate Section component.
 * Creates flat components - content goes until the next heading of ANY level.
 */
function sectionizeToComponent(node, index, parent, toc) {
  const start = node;
  const startIndex = index;
  const depth = start.depth;
  
  // Find where this section ends - next heading of ANY level (not just same/higher)
  // This creates flat sections instead of nested ones
  const isEnd = node => 
    node.type === 'heading' || 
    node.type === 'export';
  
  const end = findAfter(parent, start, isEnd);
  const endIndex = parent.children.indexOf(end);
  
  // Get all content from this heading until the next heading
  const between = parent.children.slice(
    startIndex,
    endIndex > 0 ? endIndex : undefined
  );
  
  // Extract the heading text for the title prop (and id, if specified)
  const text = extractTextFromHeading(start).trimEnd();
  const {title, id} = parseTextWithId(text);
  if (depth == 1) {
    console.warn(
      '\nWARNING:' +
      'Section with title\n' +
      ` ${title}\n` +
      'will be given the generic id\n' +
      ' page_title\n' +
      'instead of the custom id\n' +
      ` ${id}.\n`
    );
  }
  
  // Remove the original heading from the content since we're using it as a prop
  const contentWithoutHeading = between.slice(1);
  
  // Map heading depth to component name
  const componentName = getComponentNameForDepth(depth);
  
  // Create the appropriate Section JSX element
  const sectionComponent = {
    type: 'mdxJsxFlowElement',
    name: componentName,
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'title',
        value: title
      },
      {
        type: 'mdxJsxAttribute',
        name: 'id',
        value: id
      }
    ],
    children: contentWithoutHeading
  };
  
  // Replace the original content with our Section component
  parent.children.splice(startIndex, between.length, sectionComponent);

  // Add heading to table of contents
  toc.push({ depth, title, id })
}

/**
 * Map heading depth to component name.
 * Throws an error if the depth is not supported.
 */
function getComponentNameForDepth(depth) {
  const componentMap = {
    1: 'Section',
    2: 'SubSection',
    3: 'SubSubSection',
    4: 'SubSubSubSection'
  };
  
  if (!(depth in componentMap)) {
    throw new Error(
      `BUG: Unexpected heading depth ${depth} encountered in remark-section-transform plugin. ` +
      `This should never happen since the plugin only processes depths 1-4. ` +
      `Please report this as a bug.`
    );
  }
  
  return componentMap[depth];
}

/**
 * Extract plain text from a heading node. Again, only plain text! This
 * will drop all other formatting (and who knows what will happen if there
 * is any math in the heading title).
 */
function extractTextFromHeading(headingNode) {
  return headingNode.children
    .filter(child => child.type === 'text')
    .map(child => child.value)
    .join('');
}

function parseTextWithId(text) {
    // Check if text has the {#id} format at the end
    const match = text.match(/^(.+?)\s*\(#([^)]+)\)$/);
    
    if (match) {
        // Case 1: Text has {#id} format
        return {
            title: match[1].trim(),
            id: match[2]
        };
    } else {
        // Case 2: Text doesn't have {#id} format
        // Convert title to kebab-case for id using lodash
        return {
            title: text,
            id: _.kebabCase(text)
        };
    }
}

/**
 * Converts a flat array of headings into a nested structure.
 * Ignores the first heading of depth 1 and requires exactly one depth 1 heading.
 * 
 * @param {Array} flatHeadings - Array of heading objects with title, id, and depth
 * @returns {Array} Nested array of headings with children
 * @throws {Error} If there are zero or more than one headings of depth 1
 */
function nestHeadings(flatHeadings) {
  if (!flatHeadings?.length) return [];
  
  // Count and find depth 1 headings
  const depth1Headings = flatHeadings.filter(h => h.depth === 1);
  
  if (depth1Headings.length === 0) {
    throw new Error('No heading of depth 1 found');
  }
  
  if (depth1Headings.length > 1) {
    throw new Error(`Found ${depth1Headings.length} headings of depth 1, expected exactly 1`);
  }
  
  // Filter out the first (and only) depth 1 heading
  const filteredHeadings = flatHeadings.filter(h => h.depth !== 1);
  
  const nestedHeadings = [];
  const parents = new Map(); // depth -> heading mapping
  
  for (const heading of filteredHeadings) {
    const nested = { ...heading, children: [] };
    
    parents.set(heading.depth, nested);
    
    // Find the appropriate parent (closest smaller depth)
    let parent = null;
    for (let d = heading.depth - 1; d >= 1; d--) {
      if (parents.has(d)) {
        parent = parents.get(d);
        break;
      }
    }
    
    if (parent) {
      parent.children.push(nested);
    } else {
      nestedHeadings.push(nested);
    }
  }
  
  return nestedHeadings;
}