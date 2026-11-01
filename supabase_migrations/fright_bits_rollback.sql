-- Emergency switch for Fright Bits. Takes every character off the wheel and ends the collection; ownership is KEPT.
-- Does not drop anything. Safe to run at any time, and to re-run.
do $$ begin
  if to_regprocedure('public.fright_bits_end(text)') is not null then perform public.fright_bits_end('fright-bits'); end if;
end $$;
