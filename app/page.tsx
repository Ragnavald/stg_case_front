import { GroupsHome } from "@/components/groups-home";

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Despesas em grupo, sem planilha</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Lance quem pagou o quê e veja o menor número de transferências para deixar todo mundo quite.
        </p>
      </div>
      <GroupsHome />
    </div>
  );
}
