import { dbInstance, authInstance } from './auth.js';
import { USE_FIREBASE } from './firebase-config.js';

// --- Course Management ---

export async function getCourses() {
    if (USE_FIREBASE) {
        const snapshot = await dbInstance.collection('courses').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
        const res = await dbInstance.getDocs('courses');
        return res.docs.map(d => ({ id: d.id, ...d.data() }));
    }
}

export async function getCourse(courseId) {
    if (USE_FIREBASE) {
        const doc = await dbInstance.collection('courses').doc(courseId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } else {
        const doc = await dbInstance.getDoc('courses', courseId);
        return doc.exists() ? { id: doc.id, ...doc.data() } : null;
    }
}

export async function saveCourse(courseData) {
    // Generate ID if new
    const id = courseData.id || 'course_' + Date.now();
    const data = { ...courseData, id };

    if (USE_FIREBASE) {
        await dbInstance.collection('courses').doc(id).set(data, { merge: true });
    } else {
        await dbInstance.setDoc('courses', id, data, { merge: true });
    }
    return id;
}

export async function deleteCourse(courseId) {
     // Mock doesn't implement delete in the simple version, but let's assume update with deleted flag or just ignore for now as requested features focus on creation.
     // Implementing simple delete for mock:
     if (!USE_FIREBASE) {
         // MockFirestore didn't have delete.
         const dbData = JSON.parse(localStorage.getItem('zif_mock_db')) || {};
         if (dbData.courses && dbData.courses[courseId]) {
             delete dbData.courses[courseId];
             localStorage.setItem('zif_mock_db', JSON.stringify(dbData));
         }
     } else {
         await dbInstance.collection('courses').doc(courseId).delete();
     }
}


// --- User Progress ---

export async function saveProgress(userId, courseId, progressData) {
    // progressData: { status: 'completed' | 'in-progress', score: 100, lastUnit: ... }
    const docId = `${userId}_${courseId}`;

    if (USE_FIREBASE) {
        await dbInstance.collection('progress').doc(docId).set({
            userId, courseId, ...progressData, updatedAt: new Date().toISOString()
        }, { merge: true });

        // Also update user aggregate if needed
    } else {
        await dbInstance.setDoc('progress', docId, {
            userId, courseId, ...progressData, updatedAt: new Date().toISOString()
        }, { merge: true });
    }
}

export async function getUserProgress(userId) {
     if (USE_FIREBASE) {
        const snapshot = await dbInstance.collection('progress').where('userId', '==', userId).get();
        return snapshot.docs.map(doc => doc.data());
    } else {
        const res = await dbInstance.getDocs('progress', (docs) => docs.filter(d => d.userId === userId));
        return res.docs.map(d => d.data());
    }
}

// --- Class Management (for Teachers) ---

export async function createClass(teacherId, classData) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = 'class_' + Date.now();
    const data = {
        id,
        code,
        teacherId,
        name: classData.name,
        students: [], // Array of userIds
        assignments: [], // Array of courseIds
        createdAt: new Date().toISOString()
    };

    if (USE_FIREBASE) {
        await dbInstance.collection('classes').doc(id).set(data);
    } else {
        await dbInstance.setDoc('classes', id, data);
    }
    return data;
}

export async function joinClass(userId, classCode) {
    // Find class by code
    let classDoc;
    let classId;

    if (USE_FIREBASE) {
        const snapshot = await dbInstance.collection('classes').where('code', '==', classCode).get();
        if (snapshot.empty) throw new Error("Class not found");
        classDoc = snapshot.docs[0].data();
        classId = snapshot.docs[0].id;
    } else {
        const res = await dbInstance.getDocs('classes', docs => docs.filter(d => d.code === classCode));
        if (res.empty) throw new Error("Class not found");
        classDoc = res.docs[0].data();
        classId = classDoc.id;
    }

    // Add user to students list
    if (!classDoc.students.includes(userId)) {
        const newStudents = [...classDoc.students, userId];
        if (USE_FIREBASE) {
            await dbInstance.collection('classes').doc(classId).update({ students: newStudents });
        } else {
            await dbInstance.updateDoc('classes', classId, { students: newStudents });
        }
    }
    return classDoc;
}

export async function getClassesForTeacher(teacherId) {
    if (USE_FIREBASE) {
        const snapshot = await dbInstance.collection('classes').where('teacherId', '==', teacherId).get();
        return snapshot.docs.map(d => d.data());
    } else {
        const res = await dbInstance.getDocs('classes', docs => docs.filter(d => d.teacherId === teacherId));
        return res.docs.map(d => d.data());
    }
}

export async function getClassesForStudent(studentId) {
    // In mock/real, filtering arrays is harder in Firestore without 'array-contains'.
    // Mock impl:
    if (USE_FIREBASE) {
        const snapshot = await dbInstance.collection('classes').where('students', 'array-contains', studentId).get();
        return snapshot.docs.map(d => d.data());
    } else {
        const res = await dbInstance.getDocs('classes', docs => docs.filter(d => d.students && d.students.includes(studentId)));
        return res.docs.map(d => d.data());
    }
}

export async function getAllUsers() {
     if (USE_FIREBASE) {
        const snapshot = await dbInstance.collection('users').get();
        return snapshot.docs.map(d => d.data());
    } else {
        const res = await dbInstance.getDocs('users');
        return res.docs.map(d => d.data());
    }
}
