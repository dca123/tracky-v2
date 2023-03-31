import { useSearchFieldState } from "react-stately";
import { useSearchField, type AriaSearchFieldProps } from "react-aria";
import { useRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export const SearchField = (props: AriaSearchFieldProps) => {
  const { label } = props;
  const state = useSearchFieldState(props);
  const ref = useRef(null);
  const { labelProps, inputProps } = useSearchField(props, state, ref);

  return (
    <div>
      <label {...labelProps}>{label}</label>
      <div className="relative flex flex-col ">
        <div className="absolute inset-y-0 left-0 pl-2">
          <MagnifyingGlassIcon className="h-full w-4 text-slate-700" />
        </div>
        <input
          {...inputProps}
          ref={ref}
          className="flex w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 pl-8 text-sm text-emerald-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 "
        />
      </div>
    </div>
  );
};
