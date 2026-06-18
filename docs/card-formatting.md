# Card Formatting Guide

Recall supports rich text formatting in your flashcards using Markdown syntax.

## Basic Formatting

### Text Styles

```markdown
**Bold text** for emphasis
*Italic text* for subtle emphasis
~~Strikethrough~~ for corrections
`Inline code` for technical terms
```

### Headings

```markdown
# Heading 1
## Heading 2
### Heading 3
```

## Lists

### Unordered Lists

```markdown
- First item
- Second item
  - Nested item
  - Another nested item
- Third item
```

### Ordered Lists

```markdown
1. First step
2. Second step
3. Third step
```

## Code Blocks

### Inline Code

Use backticks for inline code: `const x = 42`

### Code Blocks with Syntax Highlighting

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

```python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
```

Supported languages: `javascript`, `python`, `rust`, `typescript`, `java`, `cpp`, `go`, `ruby`, `php`, `sql`, and many more.

## Mathematics (LaTeX)

### Inline Math

Use single dollar signs: `$E = mc^2$`

### Display Math

Use double dollar signs:

```latex
$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

### Common Math Examples

**Fractions**: $\frac{a}{b}$

**Square roots**: $\sqrt{x}$

**Summation**: $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$

**Matrices**:

```latex
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$
```

## Links and Images

### Links

```markdown
[Link text](https://example.com)
```

### Images

```markdown
![Alt text](image-url.png)
```

Note: Images must be accessible via URL. Local file paths are not supported for security reasons.

## Blockquotes

```markdown
> This is a quote.
> It can span multiple lines.
```

## Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

## Horizontal Rules

```markdown
---
```

## Cloze Deletions

Create fill-in-the-blank cards:

```markdown
The {{c1::mitochondria}} is the {{c2::powerhouse}} of the cell.
```

This generates two cards:
- Card 1: "The [...] is the powerhouse of the cell." → "mitochondria"
- Card 2: "The mitochondria is the [...] of the cell." → "powerhouse"

### Cloze Hints

Add hints after the answer:

```markdown
The {{c1::mitochondria::organelle}} produces energy.
```

Shows: "The [...] produces energy." with hint "organelle"

## Formatting Tips

### Keep It Simple

While rich formatting is powerful, don't overcomplicate cards. Simple text often works best.

### Use Code Blocks for Technical Content

When learning programming or technical subjects, use code blocks with proper language tags for syntax highlighting.

### Math for STEM

LaTeX support makes Recall excellent for mathematics, physics, chemistry, and engineering courses.

### Test Your Formatting

Preview cards before studying to ensure formatting renders correctly.

## Examples by Subject

### Language Learning

```markdown
**Front**: Translate to Spanish: "The house is big"
**Back**: La casa es grande
**Tags**: spanish, grammar, basic
```

### Programming

```markdown
**Front**: What does this function return?
```javascript
function mystery(n) {
  return n <= 1 ? 1 : n * mystery(n - 1);
}
mystery(5);
```
**Back**: 120 (it's factorial)
**Tags**: javascript, recursion, algorithms
```

### Biology

```markdown
**Front**: What are the four bases of DNA?
**Back**: 
- Adenine (A)
- Thymine (T)
- Guanine (G)
- Cytosine (C)
**Tags**: biology, genetics
```

### Mathematics

```markdown
**Front**: State the quadratic formula
**Back**: 
$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
**Tags**: math, algebra
```

## Import Compatibility

When importing from other formats:

- **Anki**: Most Markdown and LaTeX syntax is compatible
- **CSV**: Use Markdown in front/back columns
- **Markdown files**: Follow the card format shown in the getting started guide

## Limitations

- Images must be web-accessible URLs
- HTML tags are not supported (use Markdown instead)
- Custom CSS is not supported
- Embedded videos are not supported

For more examples, check the demo cards included when you first launch Recall.
