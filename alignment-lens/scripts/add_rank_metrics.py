"""Enrich existing validated JSON; no original trade amounts are changed."""
from pathlib import Path
import json
import pandas as pd
from data_rules import spearman_coefficient

BASE=Path(__file__).resolve().parent.parent


def main():
    files=sorted((BASE/'data/country').glob('*.json'))
    scopes={}
    for path in files:
        d=json.loads(path.read_text());scopes[d['iso3']]=d['trade_scope']
    checks=[]
    for path in files:
        d=json.loads(path.read_text())
        for code,partner in d['partners'].items():partner['trade_scope']=scopes[code]
        coefficients=[];counts=[]
        for index,year in enumerate(d['years']):
            distances=[v['dist'][index] for v in d['partners'].values()]
            shares=[v['share'][index] for v in d['partners'].values()]
            rho,count=spearman_coefficient(distances,shares)
            coefficients.append(rho);counts.append(count)
            if d['iso3'] in {'KOR','USA','DEU','TWN','SDN'} and year in {1995,2011,2023,2024}:
                frame=pd.DataFrame({'x':distances,'y':shares}).dropna()
                expected=float(frame.x.rank(method='average').corr(frame.y.rank(method='average'))) if len(frame)>1 else float('nan')
                if pd.isna(expected):assert rho is None
                else:assert rho is not None and abs(rho-expected)<1e-12
                assert count==len(frame)
                checks.append(dict(iso3=d['iso3'],year=year,rho=rho,partners=count,passed=True))
        d['rank_correlation'],d['rank_correlation_n']=coefficients,counts
        path.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
    meta=json.loads((BASE/'data/meta.json').read_text())
    meta['rank_correlation']={'method':'Spearman: Pearson correlation of average ranks across partners in each year',
        'inputs':'unrounded published distance and directional trade-share values with both observed',
        'ties':'average_rank','display_filter_applied':False,'minimum_count':2,
        'minimum_count_reason':'At least two paired observations and nonzero rank variance are mathematically required; this is not a sufficiency threshold for inference.',
        'constant_or_missing':'null','p_values':False,'causal_interpretation':False,
        'reference':'https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.spearmanr.html'}
    (BASE/'data/meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    (BASE/'review/rank-validation.json').write_text(json.dumps({'method':'Independent pandas average ranks and Pearson correlation on published input arrays','checks':checks,'passed':True},ensure_ascii=False,indent=2)+'\n')
    print(f'Added rank metrics to {len(files)} country files; {len(checks)} independent checks passed.',flush=True)


if __name__=='__main__':main()
