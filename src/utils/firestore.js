import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Save a new activity when question paper is generated
 * @param {string} userId - The faculty/user ID
 * @param {object} paperData - Object containing paper details
 * @returns {string|null} - Document ID or null on error
 */
export const saveActivity = async (userId, paperData) => {
  try {
    const docRef = await addDoc(collection(db, "activities"), {
      facultyId: userId,
      subject: paperData.subject,
      semester: paperData.semester,
      branch: paperData.branch,
      courseCode: paperData.courseCode,
      title: paperData.title,
      status: "Draft", // Initial status
      rbtDistribution: paperData.rbt, // e.g., { Remember: 20, Understand: 30, Apply: 40... }
      questions: paperData.questions, // Array of generated questions
      totalMarks: paperData.totalMarks || 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("Activity saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving activity:", error);
    return null;
  }
};

/**
 * Get recent activities for a specific faculty using real-time snapshot
 * @param {string} userId - The faculty/user ID
 * @param {number} limitCount - Number of activities to fetch (default: 5)
 * @returns {function} - Unsubscribe function
 */
export const subscribeToRecentActivities = (userId, callback, limitCount = 5) => {
  if (!userId) return () => {};

  const q = query(
    collection(db, "activities"),
    where("facultyId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  // onSnapshot updates UI in real-time
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const papers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(papers);
  });

  return unsubscribe;
};

/**
 * Get recent activities (one-time fetch)
 * @param {string} userId - The faculty/user ID
 * @param {number} limitCount - Number of activities to fetch (default: 10)
 * @returns {array} - Array of activity documents
 */
export const getRecentActivities = async (userId, limitCount = 10) => {
  try {
    const activitiesRef = collection(db, "activities");
    const q = query(
      activitiesRef,
      where("facultyId", "==", userId),
      orderBy("createdAt", "desc"),
    );
    
    const querySnapshot = await getDocs(q);
    const activities = [];
    
    querySnapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return activities.slice(0, limitCount);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
};

/**
 * Update activity status (e.g., from Draft to Validated)
 * @param {string} activityId - The activity document ID
 * @param {string} newStatus - The new status (Draft, Validated)
 * @returns {boolean} - Success status
 */
export const updateActivityStatus = async (activityId, newStatus) => {
  try {
    const activityRef = doc(db, "activities", activityId);
    await updateDoc(activityRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    console.log("Activity status updated to:", newStatus);
    return true;
  } catch (error) {
    console.error("Error updating activity status:", error);
    return false;
  }
};

/**
 * Clone a question paper to create Set B
 * @param {string} userId - The faculty/user ID
 * @param {object} originalPaper - The original paper to clone
 * @param {function} generateCallback - Callback function to generate new questions via Groq API
 * @returns {string|null} - New document ID or null on error
 */
export const cloneQuestionPaper = async (userId, originalPaper, generateCallback) => {
  try {
    // Call the generate callback to get new questions (excluding old ones)
    const newQuestions = await generateCallback({
      subject: originalPaper.subject,
      semester: originalPaper.semester,
      branch: originalPaper.branch,
      rbtDistribution: originalPaper.rbtDistribution,
      existingQuestions: originalPaper.questions, // Pass to avoid repetition
    });

    // Save the new Set B
    const newPaperId = await saveActivity(userId, {
      subject: originalPaper.subject,
      semester: originalPaper.semester,
      branch: originalPaper.branch,
      courseCode: originalPaper.courseCode,
      title: `${originalPaper.title} - Set B`,
      rbt: originalPaper.rbtDistribution,
      questions: newQuestions,
      totalMarks: originalPaper.totalMarks,
    });

    return newPaperId;
  } catch (error) {
    console.error("Error cloning question paper:", error);
    return null;
  }
};
