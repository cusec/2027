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
display name, relative file path, and SVG dimensions to the matching group there.
Logos are displayed in list order. Website links can be connected separately
when confirmed destinations are supplied.

The `custom` group appears directly after Bronze, under "Supported by"
("Avec le soutien de" in French). These organizations contributed outside the
formal sponsorship tiers.
