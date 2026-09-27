import { z } from "zod";

/**
 * Character Bible schema.
 *
 * Identity-critical attributes are either LOCKED (approved by the owner, with a source)
 * or PENDING (explicitly unknown; value must be null). Nothing in between: a pending
 * attribute can never carry a guessed value.
 */
const isoDate = z.iso.date();

export const lockedAttributeSchema = z.strictObject({
  status: z.literal("LOCKED"),
  value: z.string().min(1),
  source: z.string().min(1),
  lockedOn: isoDate,
  note: z.string().min(1).optional(),
});

export const pendingAttributeSchema = z.strictObject({
  status: z.literal("PENDING"),
  value: z.null(),
  note: z.string().min(1).optional(),
});

export const identityAttributeSchema = z.discriminatedUnion("status", [
  lockedAttributeSchema,
  pendingAttributeSchema,
]);
export type IdentityAttribute = z.infer<typeof identityAttributeSchema>;

/** Non-identity profile fields: either SET or PENDING (no guessed values). */
function profileField<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion("status", [
    z.strictObject({ status: z.literal("SET"), value }),
    z.strictObject({ status: z.literal("PENDING"), value: z.null(), note: z.string().min(1).optional() }),
  ]);
}
const textField = profileField(z.string().min(1));
const listField = profileField(z.array(z.string().min(1)).min(1));

/** Identity-critical fields. Every one must be present, as LOCKED or PENDING. */
export const IDENTITY_FIELDS = [
  "eyeColour",
  "eyeShape",
  "eyebrows",
  "nose",
  "lips",
  "jaw",
  "faceShape",
  "facialStructure",
  "facialProportions",
  "cheekbones",
  "skin",
  "hairColour",
  "hairLength",
] as const;
export type IdentityField = (typeof IDENTITY_FIELDS)[number];

const physicalIdentitySchema = z.strictObject(
  Object.fromEntries(IDENTITY_FIELDS.map((field) => [field, identityAttributeSchema])) as Record<
    IdentityField,
    typeof identityAttributeSchema
  >,
);

export const REFERENCE_CATEGORIES = [
  "PRIMARY_IDENTITY",
  "FACE",
  "BODY",
  "HAIR",
  "WARDROBE",
  "POSE",
  "ENVIRONMENT",
  "STYLE",
] as const;
export const referenceCategorySchema = z.enum(REFERENCE_CATEGORIES);
export type ReferenceCategory = z.infer<typeof referenceCategorySchema>;

/** Categories that define who Grace is (as opposed to how a picture looks). */
export const IDENTITY_REFERENCE_CATEGORIES: readonly ReferenceCategory[] = ["PRIMARY_IDENTITY", "FACE"];

const referenceEntrySchema = z.strictObject({
  label: z.string().min(1),
  category: referenceCategorySchema,
  status: z.enum(["PROPOSED", "APPROVED"]),
  /** Local path on the owner's Mac. Reference images are never stored in git. */
  localPath: z.string().min(1).nullable(),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  note: z.string().min(1).optional(),
});

export const characterBibleSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    characterId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1),
    identity: z.strictObject({
      fictional: z.literal(true),
      summary: z.string().min(1),
      username: textField,
      biography: textField,
      languages: listField,
      targetAudience: textField,
    }),
    personality: z.strictObject({
      traits: listField,
      interests: listField,
      values: listField,
      dislikes: listField,
    }),
    communicationStyle: z.strictObject({
      tone: textField,
      vocabulary: textField,
      catchphrases: listField,
    }),
    niche: z.strictObject({
      primary: z.string().min(1),
      secondary: z.array(z.string().min(1)),
      rules: z.array(z.string().min(1)),
    }),
    physicalIdentity: physicalIdentitySchema,
    visualStyle: z.strictObject({
      realism: identityAttributeSchema,
      photography: textField,
      compositions: listField,
      lighting: textField,
      colour: textField,
    }),
    wardrobe: z.strictObject({
      rule: z.string().min(1),
      categories: z.array(z.string().min(1)).min(1),
    }),
    variableAttributes: z.array(z.string().min(1)).min(1),
    generationConstraints: z.array(z.string().min(1)).min(1),
    references: z.array(referenceEntrySchema),
  })
  .superRefine((bible, ctx) => {
    const approvedPrimary = bible.references.filter(
      (r) => r.category === "PRIMARY_IDENTITY" && r.status === "APPROVED",
    );
    if (approvedPrimary.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["references"],
        message: "Only one APPROVED PRIMARY_IDENTITY reference is allowed.",
      });
    }
    bible.references.forEach((ref, index) => {
      if (ref.status === "APPROVED" && (ref.localPath === null || ref.sha256 === null)) {
        ctx.addIssue({
          code: "custom",
          path: ["references", index],
          message: "An APPROVED reference must have a localPath and sha256.",
        });
      }
    });
  });

export type CharacterBible = z.infer<typeof characterBibleSchema>;

export function lockedIdentityFields(bible: CharacterBible): Array<[IdentityField, string]> {
  return IDENTITY_FIELDS.flatMap((field) => {
    const attribute = bible.physicalIdentity[field];
    return attribute.status === "LOCKED" ? [[field, attribute.value] as [IdentityField, string]] : [];
  });
}

export function pendingIdentityFields(bible: CharacterBible): IdentityField[] {
  return IDENTITY_FIELDS.filter((field) => bible.physicalIdentity[field].status === "PENDING");
}
