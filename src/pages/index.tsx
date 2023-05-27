import { type NextPage } from "next";
import Head from "next/head";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { api } from "~/utils/api";
import { clsx } from "clsx";
import { create } from "zustand";
import {
  XCircleIcon,
  ChevronDownIcon,
  CheckIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import Fuse from "fuse.js";

import { AnimatePresence, motion } from "framer-motion";
import { SearchField } from "~/components/Search";
import { useState } from "react";
import {
  eachWeekOfInterval,
  format,
  startOfToday,
  startOfWeek,
  subWeeks,
} from "date-fns";
import * as Select from "@radix-ui/react-select";
import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "~/server/api/root";

type Issue = inferRouterOutputs<AppRouter>["jiraRouter"]["issues"][number];

interface IssueState {
  days: {
    monday: Issue[];
    tuesday: Issue[];
    wednesday: Issue[];
    thursday: Issue[];
    friday: Issue[];
  };
  addIssue: (issue: Issue, day: keyof IssueState["days"]) => void;
  removeIssue: (issue: Issue, day: keyof IssueState["days"]) => void;
  reset: () => void;
}

const initialState = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
};

const useIssuesStore = create<IssueState>((set) => ({
  days: initialState,
  addIssue: (issue, day) =>
    set((state) => ({
      days: {
        ...state.days,
        [day]:
          state.days[day].find((i) => i.id === issue.id) !== undefined
            ? state.days[day]
            : [...state.days[day], issue],
      },
    })),
  removeIssue: (issue, day) =>
    set((state) => ({
      days: {
        ...state.days,
        [day]: state.days[day].filter((i) => i.id !== issue.id),
      },
    })),
  reset: () => set({ days: initialState }),
}));

const Home: NextPage = () => {
  const addIssue = useIssuesStore((state) => state.addIssue);

  return (
    <>
      <Head>
        <title>Tracky</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container mx-auto min-h-screen space-y-8">
        <div className="flex flex-row items-center justify-between  pt-4">
          <h1 className="text-xl text-slate-700">Tracky</h1>
          <WeekSelect />
          <SubmitTimesheetButton />
        </div>
        <div className="container flex flex-col space-y-4">
          <DndContext
            onDragEnd={(e) => {
              if (e.active.id && e.over?.id) {
                addIssue(
                  e.active.data.current as Issue,
                  e.over.id as keyof IssueState["days"]
                );
              }
            }}
          >
            <div className="flex flex-row space-x-4">
              <Day label="monday" />
              <Day label="tuesday" />
              <Day label="wednesday" />
              <Day label="thursday" />
              <Day label="friday" />
            </div>
            <div className="">
              <Issues />
            </div>
          </DndContext>
        </div>
      </main>
    </>
  );
};
type DayProps = {
  label: keyof IssueState["days"];
};
const Day = (props: DayProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: props.label,
  });
  const issues = useIssuesStore((state) => state.days[props.label]);
  const removeIssues = useIssuesStore((state) => state.removeIssue);
  const capitalize = (s: string) => {
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div
      className={clsx(
        "min-h-[6rem] w-full space-y-2 rounded border-2 border-slate-300 p-2",
        isOver ? "bg-green-200" : "bg-slate-50"
      )}
      ref={setNodeRef}
    >
      <h1 className="text-xl font-light text-green-900">
        {capitalize(props.label)}
      </h1>
      <div className="grid grid-cols-1 gap-2">
        <AnimatePresence>
          {issues.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
            >
              <div className="flex w-fit flex-row items-center justify-between space-x-2 rounded-lg bg-emerald-200 px-3 py-2">
                <p className="text-sm text-emerald-900">{issue.label}</p>
                <XCircleIcon
                  className="h-5 w-5 cursor-pointer text-emerald-800"
                  onClick={() => removeIssues(issue, props.label)}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Issue = (props: Issue) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
    data: props,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div {...listeners} {...attributes} style={style} ref={setNodeRef}>
      <motion.div
        className=" flex h-full flex-col space-y-1 rounded bg-emerald-200 p-4"
        whileHover={{
          scale: 1.05,
        }}
      >
        <div className="flex flex-row justify-between">
          <p className="font-semibold text-emerald-800">{props.title}</p>
          <p className="text-sm font-light leading-6 text-emerald-900">
            {props.id}
          </p>
        </div>
        <p className="text-sm text-emerald-800">{props.epic}</p>
      </motion.div>
    </div>
  );
};

const Issues = () => {
  const query = api.jiraRouter.issues.useQuery(undefined, {
    placeholderData: [],
  });
  const [search, setSearch] = useState("");

  if (query.isLoading) {
    return <div>loading</div>;
  }
  if (query.isError) {
    return <div>error</div>;
  }

  const fuse = new Fuse(query.data, {
    keys: ["title", "epic"],
    ignoreLocation: true,
    shouldSort: true,
  });

  const result = fuse.search(search).map((r) => r.item);
  const data = search === "" ? query.data : result;

  return (
    <div className="space-y-4 rounded border-2 border-slate-300 p-6">
      <div className="flex flex-row items-center space-x-4 ">
        <h1 className="text-xl font-light text-slate-700"> Issues</h1>
        <SearchField value={search} onChange={(val) => setSearch(val)} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {data.map((issue) => (
          <Issue key={issue.id} {...issue} />
        ))}
      </div>
    </div>
  );
};

interface WeekStore {
  week: Date;
  setWeek: (weeks: Date) => void;
}

const useWeekStore = create<WeekStore>((set) => ({
  week: startOfWeek(startOfToday(), { weekStartsOn: 1 }),
  setWeek: (week) => set({ week }),
}));

const WeekSelect = () => {
  const weeks = eachWeekOfInterval(
    {
      start: subWeeks(startOfToday(), 2),
      end: startOfToday(),
    },
    {
      weekStartsOn: 1,
    }
  );
  const { week, setWeek } = useWeekStore((state) => ({
    setWeek: state.setWeek,
    week: state.week,
  }));

  return (
    <Select.Root
      value={week.toString()}
      onValueChange={(week) => {
        setWeek(new Date(week));
      }}
      defaultValue={week.toString()}
    >
      <Select.Trigger className="inline-flex h-8 items-center justify-center gap-4 rounded border-emerald-500 bg-white px-4 text-sm text-emerald-700 outline-none hover:bg-slate-50 focus:border-2 focus:shadow-md data-[placeholder]:text-emerald-600">
        <Select.Value placeholder="Start of Week" />
        <Select.Icon>
          <ChevronDownIcon className="h-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="overflow-hidden rounded border bg-white shadow-md">
          <Select.ScrollUpButton className="flex h-4 cursor-default items-center justify-center bg-white">
            <ChevronUpIcon className="h-4" />
          </Select.ScrollUpButton>
          <Select.Viewport className="p-4">
            {weeks.map((week) => (
              <SelectItem key={week.toString()} value={week.toString()}>
                {format(week, "MMMM do")}
              </SelectItem>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
type SelectItemProps = {
  value: string;
  children: React.ReactNode;
};
const SelectItem = (props: SelectItemProps) => {
  return (
    <Select.Item
      value={props.value}
      className="relative flex h-8 select-none items-center rounded pl-8 text-sm text-emerald-700 data-[highlighted]:bg-emerald-600 data-[highlighted]:text-emerald-50 data-[highlighted]:outline-none"
    >
      <Select.ItemIndicator className="absolute left-2 flex w-4 items-center justify-center">
        <CheckIcon />
      </Select.ItemIndicator>
      <Select.ItemText>{props.children}</Select.ItemText>
    </Select.Item>
  );
};

export default Home;

// type SubmitTimesheetButtonProps = {};
const SubmitTimesheetButton = () => {
  const { issues, reset } = useIssuesStore((state) => ({
    issues: state.days,
    reset: state.reset,
  }));
  const mutation = api.tempoRouter.addLogs.useMutation();
  const week = useWeekStore((state) => state.week);
  const handleSubmit = () => {
    mutation.mutate(
      {
        startOfWeek: week,
        logs: {
          monday: issues.monday.map((i) => i.id),
          tuesday: issues.tuesday.map((i) => i.id),
          wednesday: issues.wednesday.map((i) => i.id),
          thursday: issues.thursday.map((i) => i.id),
          friday: issues.friday.map((i) => i.id),
        },
      },
      {
        onSuccess: () => reset(),
      }
    );
  };

  return (
    <motion.button
      layout
      className="rounded border-2 border-emerald-500 p-1 px-2 text-sm font-semibold text-green-600"
      whileHover={{
        scale: 1.05,
      }}
      onClick={handleSubmit}
    >
      {mutation.isLoading ? "Saving to Tempo" : "Submit Timesheet"}
    </motion.button>
  );
};
