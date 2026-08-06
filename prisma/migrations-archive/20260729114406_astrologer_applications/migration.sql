-- CreateTable
CREATE TABLE "astrologer_applications" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "fullName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "profilePhotoPath" TEXT,
    "primaryPractice" TEXT NOT NULL,
    "primaryPracticeOther" TEXT,
    "additionalPractices" TEXT[],
    "yearsOfExperience" TEXT NOT NULL,
    "learningMethods" TEXT[],
    "learningMethodOther" TEXT,
    "teacherGuruInstitute" TEXT,
    "hasFormalQualification" BOOLEAN NOT NULL DEFAULT false,
    "qualificationName" TEXT,
    "areasOfExpertise" TEXT[],
    "areasOfExpertiseOther" TEXT,
    "specialization" TEXT,
    "languages" TEXT[],
    "languageOther" TEXT,
    "consultationMethods" TEXT[],
    "availabilityFrequency" TEXT NOT NULL,
    "previousConsultationExperience" TEXT NOT NULL,
    "previousConsultationLocations" TEXT[],
    "professionalProfileUrl" TEXT,
    "aboutYou" TEXT NOT NULL,
    "consultationApproach" TEXT NOT NULL,
    "sensitiveQuestionsApproach" TEXT NOT NULL,
    "whyJoinAskchetna" TEXT NOT NULL,
    "predictionCommunication" TEXT NOT NULL,
    "predictionCommunicationOther" TEXT,
    "declarationAccuracy" BOOLEAN NOT NULL DEFAULT false,
    "declarationNoGuarantee" BOOLEAN NOT NULL DEFAULT false,
    "declarationTerms" BOOLEAN NOT NULL DEFAULT false,
    "declarationAdditionalVerification" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "infoRequest" TEXT,
    "infoRequestedAt" TIMESTAMP(3),

    CONSTRAINT "astrologer_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "astrologer_applications_ref_key" ON "astrologer_applications"("ref");

-- CreateIndex
CREATE INDEX "astrologer_applications_status_submittedAt_idx" ON "astrologer_applications"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "astrologer_applications_userId_idx" ON "astrologer_applications"("userId");

-- AddForeignKey
ALTER TABLE "astrologer_applications" ADD CONSTRAINT "astrologer_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

