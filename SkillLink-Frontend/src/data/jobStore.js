import AsyncStorage from "@react-native-async-storage/async-storage";

const JOB_KEY = "skilllink_jobs";

export const addJob = async (job) => {
  const existing = await getJobs();
  const updated = [...existing, job];
  await AsyncStorage.setItem(JOB_KEY, JSON.stringify(updated));
};

export const getJobs = async () => {
  const data = await AsyncStorage.getItem(JOB_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateJobStatus = async (id, status, acceptedBy = null) => {
  const jobs = await getJobs();

  const updatedJobs = jobs.map((job) =>
    job.id === id
      ? { ...job, status, acceptedBy }
      : job
  );

  await AsyncStorage.setItem("jobs", JSON.stringify(updatedJobs));
};

