import { visit } from 'unist-util-visit';

/**
 * Remark plugin that transforms markdown code blocks into CodeBox components
 */
export function remarkCodeTransform() {
  return function transformer(tree, file) {
    // Visit all code nodes in the AST
    visit(tree, 'code', (node, index, parent) => {
      // Extract the code content and language
      const code = node.value || '';
      const language = node.lang || '';
      
      // Parse meta string for additional attributes
      const meta = parseMeta(node.meta || '');
      
      // Create the JSX element for CodeBox component
      const codeBoxElement = {
        type: 'mdxJsxFlowElement',
        name: 'CodeBox',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'code',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              value: JSON.stringify(code),
              data: {
                estree: {
                  type: 'Program',
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: {
                        type: 'Literal',
                        value: code,
                        raw: JSON.stringify(code)
                      }
                    }
                  ]
                }
              }
            }
          },
          {
            type: 'mdxJsxAttribute',
            name: 'language',
            value: language
          }
        ],
        children: []
      };
      
      // Add optional attributes if they exist in meta
      if (meta.id) {
        codeBoxElement.attributes.push({
          type: 'mdxJsxAttribute',
          name: 'id',
          value: meta.id
        });
      }
      
      // Replace the code node with the JSX element
      parent.children[index] = codeBoxElement;
    });
  };
}

/**
 * Parse meta string to extract attributes
 * Supports formats like: id="test1"
 */
function parseMeta(meta) {
  const attributes = {};
  
  if (!meta) return attributes;
  
  // Match key="value" or key=value patterns
  const matches = meta.match(/(\w+)=(?:"([^"]*)"|([^\s]+))/g);
  
  if (matches) {
    matches.forEach(match => {
      const [, key, quotedValue, unquotedValue] = match.match(/(\w+)=(?:"([^"]*)"|([^\s]+))/);
      attributes[key] = quotedValue || unquotedValue;
    });
  }
  
  return attributes;
}