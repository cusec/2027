# Sponsor logos

Store each company's approved logo in its category folder:

- `partner/`
- `silver/`
- `bronze/`
- `in-kind/`
- `community-partner/`
- `custom/`

## Files to supply

Prefer the original SVG. A transparent PNG or WebP is also suitable; aim for
at least 1000 pixels on its longest side without upscaling a smaller image.
Use a version intended for a light background. Keep the original proportions
and avoid screenshots or extra blank space around the logo.

Use lowercase, hyphenated filenames, such as `company-name.svg`. For variants,
use a descriptive suffix, such as `company-name-wordmark.svg`.

When handing over the files, include each company's exact display name and
website URL. Place files directly in the appropriate folder, or send a ZIP
with the same category folders. These folders contain public website assets.

The sponsors page reads its entries from
`src/app/components/v2/Sponsors/sponsorsData.ts`. When adding a new logo, add its
display name, relative file path, image dimensions, and official website URL to
the matching group there. Logos are displayed in list order and link to the
associated website.

The `custom` group appears directly after Bronze. Only the in-kind group has a
heading. The VIA Rail logo comes from its [official media kit](https://corpo.viarail.ca/en/media-kit).
