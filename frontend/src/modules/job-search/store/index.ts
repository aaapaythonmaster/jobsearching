import { defineStore } from 'pinia'
import { ref } from 'vue'
import { jobSearchApi, type JobPostListQuery, type ResumeListQuery } from '../api'
import type {
  ApplicationStatus,
  ApplicationStatusCreateInput,
  ApplicationStatusUpdateInput,
  JobPost,
  JobContextMode,
  JobPostCreateInput,
  JobPostUpdateInput,
  Resume,
  ResumeUpdateInput,
} from '../types'

export const useJobSearchStore = defineStore('job-search', () => {
  const resumes = ref<Resume[]>([])
  const jobs = ref<JobPost[]>([])
  const statuses = ref<ApplicationStatus[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const contextJob = ref<JobPost | null>(null)
  const contextMode = ref<JobContextMode>('detail')

  function openJobContext(job: JobPost, mode: JobContextMode = 'detail') {
    contextJob.value = job
    contextMode.value = mode
  }

  function setJobContextMode(mode: JobContextMode) {
    if (contextJob.value) contextMode.value = mode
  }

  function clearJobContext() {
    contextJob.value = null
    contextMode.value = 'detail'
  }

  async function run<T>(work: () => Promise<T>): Promise<T> {
    loading.value = true
    error.value = null
    try {
      return await work()
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  function setResume(next: Resume) {
    resumes.value = resumes.value.map((item) => (item.id === next.id ? next : item))
  }

  function setJob(next: JobPost) {
    jobs.value = jobs.value.map((item) => (item.id === next.id ? next : item))
  }

  function setStatus(next: ApplicationStatus) {
    statuses.value = statuses.value.map((item) => (item.id === next.id ? next : item))
  }

  async function fetchResumes(query: ResumeListQuery = {}) {
    resumes.value = await run(() => jobSearchApi.listResumes(query))
  }

  async function uploadResume(input: Parameters<typeof jobSearchApi.uploadResume>[0]) {
    const resume = await run(() => jobSearchApi.uploadResume(input))
    resumes.value = [resume, ...resumes.value]
    return resume
  }

  async function updateResume(id: string, input: ResumeUpdateInput) {
    const resume = await run(() => jobSearchApi.updateResume(id, input))
    setResume(resume)
    return resume
  }

  async function removeResume(id: string) {
    await run(() => jobSearchApi.removeResume(id))
    resumes.value = resumes.value.filter((item) => item.id !== id)
  }

  async function fetchJobs(query: JobPostListQuery = {}) {
    jobs.value = await run(() => jobSearchApi.listJobs(query))
  }

  async function createJob(input: JobPostCreateInput) {
    const job = await run(() => jobSearchApi.createJob(input))
    jobs.value = [job, ...jobs.value]
    return job
  }

  async function updateJob(id: string, input: JobPostUpdateInput) {
    const job = await run(() => jobSearchApi.updateJob(id, input))
    setJob(job)
    if (contextJob.value?.id === job.id) contextJob.value = job
    return job
  }

  async function removeJob(id: string) {
    await run(() => jobSearchApi.removeJob(id))
    jobs.value = jobs.value.filter((item) => item.id !== id)
  }

  async function fetchStatuses() {
    statuses.value = await run(() => jobSearchApi.listStatuses())
  }

  async function createStatus(input: ApplicationStatusCreateInput) {
    const status = await run(() => jobSearchApi.createStatus(input))
    statuses.value = [...statuses.value, status].sort((a, b) => a.sortOrder - b.sortOrder)
    return status
  }

  async function updateStatus(id: string, input: ApplicationStatusUpdateInput) {
    const status = await run(() => jobSearchApi.updateStatus(id, input))
    setStatus(status)
    statuses.value = [...statuses.value].sort((a, b) => a.sortOrder - b.sortOrder)
    return status
  }

  async function removeStatus(id: string) {
    await run(() => jobSearchApi.removeStatus(id))
    statuses.value = statuses.value.filter((item) => item.id !== id)
  }

  return {
    resumes,
    jobs,
    statuses,
    loading,
    error,
    contextJob,
    contextMode,
    openJobContext,
    setJobContextMode,
    clearJobContext,
    fetchResumes,
    uploadResume,
    updateResume,
    removeResume,
    fetchJobs,
    createJob,
    updateJob,
    removeJob,
    fetchStatuses,
    createStatus,
    updateStatus,
    removeStatus,
  }
})
