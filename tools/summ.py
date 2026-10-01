import sys,json
for line in sys.stdin:
    line=line.strip()
    if not line.startswith('{'): continue
    d=json.loads(line)
    print('seed',d['seed'],d['policy'],'esc day',d['esc'],'launched',d['launched'],'attr',{k:round(v,1) for k,v in d['attr'].items()})
    f=d['final'];print(' final',{k:f[k] for k in ['d','ren','loc','libFull','libPart','src','srcLv','people','sold','ships','rooms','acc','sup','cr','intel']})
    if '-v' in sys.argv:
        for r in d['tl']: print('  d%-3d ren %-5s loc %d src %d ppl %d ships %d rooms %d acc %d sup %d lib %d/%d cr %d intel %d'%(r['d'],r['ren'],r['loc'],r['src'],r['people'],r['ships'],r['rooms'],r['acc'],r['sup'],r['libFull'],r['libPart'],r['cr'],r['intel']))
    print(' roles',f['roles'],'rooms',f['roomKeys'],'dipOut',f['dipOut'],'chains',f['chains'])
    print(' lib',f['libDetail'])
    print(' stuck',d['stuckAvail'][:4])
