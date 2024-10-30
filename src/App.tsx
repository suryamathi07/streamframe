import React, { useState, useEffect } from "react";
import "./App.css";
import { v4 as uuidv4 } from "uuid";
import { ToastContainer, toast } from "react-toastify"; // Import Toastify
import "react-toastify/dist/ReactToastify.css"; // Import Toastify styles
import Header from "./Header";
type TaskStatus = "IN PROGRESS" | "DONE" | "COMPLETE";

interface Task {
  id: string; // Changed to string for UUID
  name: string;
  status: TaskStatus;
  parentId?: string; // Changed to string for UUID
  showNoTaskMessage?: boolean;
}

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState("");
  const [parentTaskId, setParentTaskId] = useState<string | undefined>(
    undefined
  );

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 20; // Number of tasks to show per page

  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");

  // Calculate the total number of root parent tasks
  const totalParentTasks = tasks.filter(
    (task) => task.parentId === undefined
  ).length;

  // Calculate the number of ongoing root parent tasks
  const tasksLeft = tasks.filter(
    (task) => task.parentId === undefined && task.status === "IN PROGRESS"
  ).length;

  // Filter tasks based on status
  const filteredTasks = tasks.filter((task) =>
    statusFilter === "ALL" ? true : task.status === statusFilter
  );

  // Load tasks from local storage on component mount
  useEffect(() => {
    const storedTasks = localStorage.getItem("tasks");
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  }, []); // Empty dependency array means this runs once on mount

  // Function to check for circular dependencies
  const hasCircularDependency = (
    taskId: string,
    potentialParentId: string | undefined
  ): boolean => {
    if (taskId === potentialParentId) return true; // Immediate circular dependency

    let parent = tasks.find((task) => task.id === potentialParentId);
    while (parent) {
      if (parent.id === taskId) return true; // Circular dependency detected
      parent = tasks.find((task) => task.id === parent?.parentId);
    }
    return false;
  };

  // Function to handle new task creation
  const handleAddTask = () => {
    if (!taskName.trim()) {
      toast.error("Task name cannot be empty!"); // Show error if task name is empty
      return;
    }

    const newTaskId = uuidv4(); // Use UUID for unique ID
    if (hasCircularDependency(newTaskId, parentTaskId)) {
      alert("Cannot set this parent task as it creates a circular dependency.");
      return;
    }

    if (parentTaskId && !tasks.some((task) => task.id === parentTaskId)) {
      alert("Selected parent task does not exist.");
      return;
    }

    const newTask: Task = {
      id: newTaskId,
      name: taskName,
      status: "IN PROGRESS", // Ensure this matches TaskStatus
      parentId: parentTaskId,
      showNoTaskMessage: false,
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setTaskName(""); // Reset task name input
    setParentTaskId(undefined); // Reset parent task selection
    localStorage.setItem("tasks", JSON.stringify(updatedTasks)); // Save to local storage
    toast.success(`New Task "${taskName}" created!`);
  };

  // Function to handle updating a task's name
  const handleUpdateTaskName = (taskId: string) => {
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) =>
        task.id === taskId ? { ...task, name: editingTaskName } : task
      );
      localStorage.setItem("tasks", JSON.stringify(updatedTasks)); // Update local storage
      return updatedTasks;
    });
    setEditingTaskId(null); // Reset editing task ID
    setEditingTaskName(""); // Reset editing task name
  };

  const handleToggleNoTaskMessage = (taskId: string) => {
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, showNoTaskMessage: !task.showNoTaskMessage }
          : task
      );
      localStorage.setItem("tasks", JSON.stringify(updatedTasks)); // Update local storage
      return updatedTasks;
    });
  };

  // Function to handle deleting a task
  const handleDeleteTask = (taskId: string) => {
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.filter((task) => task.id !== taskId);
      if (parentTaskId === taskId) {
        setParentTaskId(undefined);
      }
      localStorage.setItem("tasks", JSON.stringify(updatedTasks)); // Update local storage
      return updatedTasks;
    });
    // Find the deleted task to get its name
    const deletedTask = tasks.find((task) => task.id === taskId);
    if (deletedTask) {
      toast.error(`Task "${deletedTask.name}" deleted!`); // Show the deleted task name
    } else {
      toast.error(`Task deleted!`); // Fallback message
    }
  };

  // Function to handle checkbox change
  const handleCheckboxChange = (taskId: string) => {
    // Update the task status
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status:
                task.parentId === undefined
                  ? ("COMPLETE" as TaskStatus) // Ensuring it matches TaskStatus
                  : task.status === "DONE"
                  ? ("IN PROGRESS" as TaskStatus)
                  : ("DONE" as TaskStatus),
            }
          : task
      );

      // Check and update the parent task status if necessary
      const parentId = updatedTasks.find(
        (task) => task.id === taskId
      )?.parentId;
      if (parentId) {
        const allChildrenDone = areAllChildrenDone(updatedTasks, parentId!);
        if (allChildrenDone) {
          updatedTasks.forEach((task) => {
            if (task.id === parentId) {
              task.status = "COMPLETE" as TaskStatus; // Ensuring it matches TaskStatus
            }
          });
        }
      }

      return updatedTasks;
    });
  };
  // Function to check if all child tasks are done
  const areAllChildrenDone = (tasks: Task[], parentId: string): boolean => {
    const children = tasks.filter((task) => task.parentId === parentId);
    // Only check if children exist
    if (children.length > 0) {
      return children.every((task) => task.status === "DONE");
    }
    return true; // If no children, return true
  };

  // Function to count total IN PROGRESS tasks
  const countInProgressTasks = (tasks: Task[]): number => {
    return tasks.filter((task) => task.status === "IN PROGRESS").length;
  };

  // Function to render tasks recursively
  // Function to render tasks recursively, applying the status filter
  const renderTasks = (parentId?: string) => {
    return tasks
      .filter((task) => task.parentId === parentId)
      .filter((task) => statusFilter === "ALL" || task.status === statusFilter) // Apply status filter here
      .slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage) // Paginate
      .map((task) => {
        const hasChildren = tasks.some((child) => child.parentId === task.id);

        return (
          <div
            key={task.id}
            className={task.parentId === undefined ? "parent-root" : ""} // Class added for tasks without a parent
          >
            <div>
              <button
                className="accordtion-btn"
                onClick={() => handleToggleNoTaskMessage(task.id)}
              >
                {!task.showNoTaskMessage ? (
                  <i className="fa-solid fa-plus"></i>
                ) : (
                  <i className="fa-solid fa-minus"></i>
                )}
              </button>
              {editingTaskId === task.id ? (
                <>
                  <input
                    type="text"
                    value={editingTaskName}
                    onChange={(e) => setEditingTaskName(e.target.value)}
                    placeholder="Edit Task Name"
                  />
                  <button onClick={() => handleUpdateTaskName(task.id)}>
                    Update
                  </button>
                </>
              ) : (
                <>
                  {task.name} -
                  <button
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setEditingTaskName(task.name);
                    }}
                  >
                    Edit
                  </button>
                </>
              )}
              <div className="test">
                {task.status}
                <input
                  type="checkbox"
                  checked={task.status === "DONE" || task.status === "COMPLETE"}
                  onChange={() => handleCheckboxChange(task.id)}
                  disabled={!areAllChildrenDone(tasks, task.id)}
                  style={{ marginLeft: "10px" }}
                />
                <button
                  className="btn"
                  onClick={() => handleDeleteTask(task.id)}
                  style={{ marginLeft: "10px" }}
                >
                  <i className="fa-solid fa-delete-left"></i>
                </button>
              </div>

              {!hasChildren && task.showNoTaskMessage && (
                <div style={{ marginTop: "10px", color: "red" }}>No Task</div>
              )}
              {task.showNoTaskMessage && (
                <div>
                  {renderTasks(task.id)} {/* Render child tasks */}
                  <input
                    type="text"
                    placeholder="Task Name"
                    onChange={(e) => {
                      setTaskName(e.target.value);
                      setParentTaskId(task.id);
                    }}
                    onFocus={() => setParentTaskId(task.id)}
                    required
                  />
                  <button onClick={handleAddTask}>Add Task</button>
                </div>
              )}
            </div>
          </div>
        );
      });
  };

  // Handle page change for pagination
  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Calculate total number of pages
  const totalPages = Math.ceil(
    tasks.filter((task) => task.parentId === undefined).length / tasksPerPage
  );

  return (
    <div>
      <Header />

      {/* Task creation form */}
      <div className="task-wrapper">
        <div className="task-controls">
          <div className="task-parent-creation">
            <input
              type="text"
              placeholder="Task Name"
              onChange={(e) => {
                setTaskName(e.target.value);
                setParentTaskId(undefined);
              }}
              onFocus={() => setParentTaskId(undefined)}
              required
            />
            <button onClick={handleAddTask}>Add Task</button>
          </div>
          <div className="task-parent-filter">
            <label>Status Filter:</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as TaskStatus | "ALL")
              }
            >
              <option value="ALL">All</option>
              <option value="IN PROGRESS">In Progress</option>
              <option value="COMPLETE">Complete</option>
            </select>
          </div>
          <div className="task-parent-count">
            <p className="taskleft">{tasksLeft}</p>
            <p>/</p>
            <p className="totaltask">{totalParentTasks}</p>
          </div>
        </div>
        {/* Task listing */}
        <div className="task-content">
          {renderTasks()} {/* Render tasks without a parent */}
          {/* Pagination controls */}
          <div className="pagination">
            <button
              onClick={() => handlePageChange("prev")}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span style={{ margin: "0 10px" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange("next")}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default App;
