(function () {
  const LectureManager = {
    createTemplate(interfaceLanguage) {
      const now = Date.now();
      return {
        id: `lecture-${now}`,
        title: "",
        date: null,
        updatedAt: now,
        durationMs: 0,
        transcriptText: "",
        notes: "",
        technicalTerms: [],
        courseName: "",
        topic: "",
        additionalContext: "",
        interfaceLanguage: interfaceLanguage || "en",
        paragraphs: [],
        segments: [],
        transcriptState: null,
        documents: [],
        uploadedMedia: null,
      };
    },

    getDocuments(lecture) {
      return Array.isArray(lecture && lecture.documents) ? lecture.documents : [];
    },

    getUploadedMedia(lecture) {
      return lecture && lecture.uploadedMedia ? lecture.uploadedMedia : null;
    },

    syncFormFields(lecture, formData, documents) {
      if (!lecture) {
        return null;
      }

      const safeFormData = formData || {};
      lecture.title = safeFormData.title || "";
      lecture.courseName = safeFormData.courseName || "";
      lecture.topic = safeFormData.topic || "";
      lecture.additionalContext = safeFormData.additionalContext || "";
      lecture.interfaceLanguage = safeFormData.interfaceLanguage || lecture.interfaceLanguage || "en";
      lecture.documents = Array.isArray(documents) ? documents : [];
      lecture.updatedAt = Date.now();
      return lecture;
    },

    syncTranscriptState(lecture, transcriptProcessor, documents) {
      if (!lecture || !transcriptProcessor) {
        return null;
      }

      const transcriptState = transcriptProcessor.getState();
      lecture.transcriptText = transcriptProcessor.getTranscriptText();
      lecture.technicalTerms = transcriptProcessor.getTechnicalTerms();
      lecture.transcriptState = transcriptState;
      lecture.paragraphs = transcriptState.paragraphs;
      lecture.segments = transcriptState.segments;
      lecture.documents = Array.isArray(documents) ? documents : [];
      lecture.updatedAt = Date.now();
      return lecture;
    },

    createTranscriptProcessor(lecture, segmentIntervalMinutes) {
      const processor = window.TranscriptProcessor.create({ segmentIntervalMinutes });
      if (!lecture) {
        return processor;
      }

      processor.restore(
        lecture.transcriptState || {
          paragraphs: lecture.paragraphs || [],
          segments: lecture.segments || [],
          technicalTerms: lecture.technicalTerms || [],
        }
      );

      return processor;
    },
  };

  window.LectureManager = LectureManager;
})();